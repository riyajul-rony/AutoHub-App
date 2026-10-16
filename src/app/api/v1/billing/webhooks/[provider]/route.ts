import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/server/billing/providers/registry";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const providerKey = (providerParam || "manual").toLowerCase();
  const provider = getPaymentProvider(providerKey);

  // 1. Read raw body as text for cryptographic signature check
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to read raw body" }, { status: 400 });
  }

  // 2. Extract headers
  const headersRecord: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersRecord[key.toLowerCase()] = value;
  });

  try {
    // 3. Process webhook through provider
    const result = await provider.handleWebhook(rawBody, headersRecord);

    if (!result.handled || !result.eventId) {
      return NextResponse.json({ error: "Unhandled event" }, { status: 400 });
    }

    // 4. Idempotency Check: Don't process the same event twice
    const alreadyProcessed = await db.processed_webhook_events.findUnique({
      where: {
        provider_event_id: {
          provider: providerKey,
          event_id: result.eventId,
        },
      },
    }).catch(() => null);

    if (alreadyProcessed) {
      logger.info(
        { provider: providerKey, eventId: result.eventId, eventType: result.eventType },
        "Webhook event already processed (idempotent skipped)"
      );
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    // Parse payload for metadata
    let payloadJson: any = {};
    try {
      payloadJson = JSON.parse(rawBody);
    } catch {}

    // 5. Handle Business Logic based on event type
    if (
      result.eventType.includes("succeeded") ||
      result.eventType.includes("completed") ||
      result.eventType === "payment.paid"
    ) {
      // Payment Succeeded
      let payment = null;
      if (result.paymentId) {
        payment = await db.payments.findFirst({
          where: {
            OR: [
              { id: result.paymentId },
              { provider_payment_id: result.paymentId },
            ],
          },
        });
      }

      if (payment) {
        await db.payments.update({
          where: { id: payment.id },
          data: {
            status: "succeeded",
            paid_at: new Date(),
          },
        });

        if (payment.subscription_id) {
          const sub = await db.subscriptions.findUnique({
            where: { id: payment.subscription_id },
          });

          if (sub) {
            const now = new Date();
            const nextPeriodEnd = new Date(sub.current_period_end || now);
            if (nextPeriodEnd < now) {
              nextPeriodEnd.setTime(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            } else {
              nextPeriodEnd.setTime(nextPeriodEnd.getTime() + 30 * 24 * 60 * 60 * 1000);
            }

            await db.subscriptions.update({
              where: { id: sub.id },
              data: {
                status: "active",
                current_period_end: nextPeriodEnd,
              },
            });

            // Update user's active plan
            const plan = await db.plans.findUnique({ where: { id: sub.plan_id } });
            if (plan) {
              await db.users.update({
                where: { id: sub.user_id },
                data: {
                  plan: plan.slug,
                  plan_id: plan.id,
                },
              });

              // Send in-app notification
              await db.notifications.create({
                data: {
                  user_id: sub.user_id,
                  type: "subscription_activated",
                  title: `🎉 ${plan.name} Plan Active!`,
                  body: `Your payment was verified and your ${plan.name} plan is now active through ${nextPeriodEnd.toLocaleDateString()}.`,
                  entity_type: "subscription",
                  entity_id: sub.id,
                },
              }).catch(() => null);
            }
          }
        }
      }
    } else if (
      result.eventType.includes("canceled") ||
      result.eventType.includes("deleted")
    ) {
      // Subscription Canceled
      if (result.subscriptionId) {
        const sub = await db.subscriptions.findFirst({
          where: {
            OR: [
              { id: result.subscriptionId },
              { provider_subscription_id: result.subscriptionId },
            ],
          },
        });

        if (sub) {
          await db.subscriptions.update({
            where: { id: sub.id },
            data: { status: "canceled", cancel_at_period_end: true },
          });
        }
      }
    } else if (result.eventType.includes("refunded")) {
      // Payment Refunded
      if (result.paymentId) {
        const payment = await db.payments.findFirst({
          where: {
            OR: [
              { id: result.paymentId },
              { provider_payment_id: result.paymentId },
            ],
          },
        });
        if (payment) {
          await db.payments.update({
            where: { id: payment.id },
            data: {
              status: "refunded",
              refunded_at: new Date(),
              refund_reason: "Provider webhook notification",
            },
          });
        }
      }
    }

    // 6. Record event in idempotency table
    await db.processed_webhook_events.create({
      data: {
        provider: providerKey,
        event_id: result.eventId,
        event_type: result.eventType,
        payload: payloadJson,
      },
    }).catch(() => null);

    return NextResponse.json({ received: true, success: true }, { status: 200 });
  } catch (err: any) {
    logger.error({ provider: providerKey, err: err.message }, "Webhook execution error");
    return NextResponse.json({ error: err.message || "Webhook processing error" }, { status: 400 });
  }
}
