import { db } from "@/server/db";
import { PaymentProvider, CheckoutSessionOptions, CheckoutResult, WebhookResult } from "./types";
import { getConfig } from "@/server/config";

export class ManualPaymentProvider implements PaymentProvider {
  readonly id = "manual";
  readonly name = "Manual Payment (bKash / Bank / Crypto)";

  async createCheckout(options: CheckoutSessionOptions): Promise<CheckoutResult> {
    const now = new Date();
    const periodEnd = new Date(now);
    if (options.interval === "yearly") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // 1. Create or link subscription in pending/active status
    let subscription = await db.subscriptions.findFirst({
      where: {
        user_id: options.userId,
        status: { in: ["active", "trialing", "past_due"] },
      },
    });

    if (!subscription) {
      subscription = await db.subscriptions.create({
        data: {
          user_id: options.userId,
          plan_id: options.planId,
          status: "active",
          current_period_start: now,
          current_period_end: periodEnd,
          provider: "manual",
          provider_subscription_id: `manual_sub_${Date.now()}`,
        },
      });
    }

    // 2. Generate unique invoice number: INV-YYYYMM-XXXX
    const yyyymm = now.toISOString().slice(0, 7).replace("-", "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${yyyymm}-${randomSuffix}`;

    // 3. Create payment record
    const payment = await db.payments.create({
      data: {
        user_id: options.userId,
        subscription_id: subscription.id,
        amount: options.amount,
        currency: options.currency || "USD",
        status: "pending",
        provider: "manual",
        provider_payment_id: `manual_pay_${Date.now()}`,
        invoice_number: invoiceNumber,
        method_details: {
          plan_name: options.planName,
          interval: options.interval,
          note: "Pending manual verification by admin",
        },
      },
    });

    const customInstructions = (await getConfig("MANUAL_PAYMENT_INSTRUCTIONS" as any)) || `
      Please send ${options.currency} ${options.amount} to our official accounts:
      - bKash / Nagad: 01700-000000 (Personal)
      - Bank Transfer: AutoHub Ltd, AC: 123456789, Routing: 987654321
      Include your Invoice #${invoiceNumber} in the reference, then notify admin.
    `;

    return {
      sessionId: payment.id,
      provider: "manual",
      invoiceNumber,
      instructionHtml: customInstructions.trim(),
    };
  }

  async handleWebhook(rawBody: string, headers: Record<string, string>): Promise<WebhookResult> {
    try {
      const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
      return {
        handled: true,
        eventType: payload.type || "manual.payment.event",
        eventId: payload.id || `manual_evt_${Date.now()}`,
        paymentId: payload.payment_id,
        status: payload.status,
      };
    } catch {
      return {
        handled: false,
        eventType: "manual.unknown",
        eventId: `manual_err_${Date.now()}`,
      };
    }
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<boolean> {
    const sub = await db.subscriptions.findFirst({
      where: { provider_subscription_id: providerSubscriptionId },
    });
    if (sub) {
      await db.subscriptions.update({
        where: { id: sub.id },
        data: { cancel_at_period_end: true },
      });
    }
    return true;
  }
}
