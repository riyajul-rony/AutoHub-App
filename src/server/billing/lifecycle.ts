import { db } from "@/server/db";
import { logger } from "@/server/logger";

/**
 * Checks and expires overdue subscriptions, reverting tenants to the Free plan.
 */
export async function expireOverdueSubscriptions(): Promise<{ expiredCount: number }> {
  const now = new Date();

  // Find all active or past_due subscriptions that passed their expiration date
  const overdueSubs = await db.subscriptions.findMany({
    where: {
      status: { in: ["active", "past_due"] },
      current_period_end: { lt: now },
    },
  }).catch(() => []);

  let expiredCount = 0;
  const freePlan = await db.plans.findUnique({ where: { slug: "free" } }).catch(() => null);

  for (const sub of overdueSubs) {
    try {
      // 1. Mark subscription as expired
      await db.subscriptions.update({
        where: { id: sub.id },
        data: { status: "expired" },
      });

      // 2. Revert user to free plan
      await db.users.update({
        where: { id: sub.user_id },
        data: {
          plan: "free",
          plan_id: freePlan?.id || null,
        },
      });

      // 3. Dispatch in-app notification
      const dedupeType = `sub_expired_${sub.id}`;
      const existingNotif = await db.notifications.findFirst({
        where: { user_id: sub.user_id, type: dedupeType },
      }).catch(() => null);

      if (!existingNotif) {
        await db.notifications.create({
          data: {
            user_id: sub.user_id,
            type: dedupeType,
            title: "Plan Expired — Reverted to Free",
            body: "Your subscription period has ended. Your account has automatically reverted to the Free plan. Upgrade anytime to restore higher quotas.",
            entity_type: "subscription",
            entity_id: sub.id,
          },
        }).catch(() => null);

        await db.activity_logs.create({
          data: {
            user_id: sub.user_id,
            type: "subscription.expired",
            message: `Subscription ${sub.id} expired; user reverted to Free plan.`,
            meta: { subscriptionId: sub.id, planId: sub.plan_id },
          },
        }).catch(() => null);
      }

      expiredCount++;
    } catch (err: any) {
      logger.error({ subId: sub.id, err: err.message }, "Failed to expire subscription");
    }
  }

  return { expiredCount };
}

/**
 * Checks active subscriptions expiring within 3 days and sends reminder notifications.
 */
export async function sendRenewalReminders(): Promise<{ remindersSent: number }> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const expiringSubs = await db.subscriptions.findMany({
    where: {
      status: "active",
      current_period_end: {
        gte: now,
        lte: threeDaysFromNow,
      },
    },
  }).catch(() => []);

  let remindersSent = 0;

  for (const sub of expiringSubs) {
    try {
      const endDayStr = new Date(sub.current_period_end).toISOString().slice(0, 10);
      const dedupeType = `sub_reminder_3d_${sub.id}_${endDayStr}`;

      const existingNotif = await db.notifications.findFirst({
        where: { user_id: sub.user_id, type: dedupeType },
      }).catch(() => null);

      if (!existingNotif) {
        const formattedDate = new Date(sub.current_period_end).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        await db.notifications.create({
          data: {
            user_id: sub.user_id,
            type: dedupeType,
            title: "⏳ Subscription Renewal Reminder",
            body: `Your active plan will expire on ${formattedDate}. Please verify your payment method or contact support to ensure uninterrupted automation.`,
            entity_type: "subscription",
            entity_id: sub.id,
          },
        }).catch(() => null);

        await db.activity_logs.create({
          data: {
            user_id: sub.user_id,
            type: "subscription.reminder_3d",
            message: `3-day renewal reminder dispatched for subscription ${sub.id}.`,
            meta: { subscriptionId: sub.id, expiresAt: sub.current_period_end },
          },
        }).catch(() => null);

        remindersSent++;
      }
    } catch (err: any) {
      logger.warn({ subId: sub.id, err: err.message }, "Failed to send 3-day renewal reminder");
    }
  }

  return { remindersSent };
}

/**
 * Combined subscription lifecycle worker execution
 */
export async function processSubscriptionLifecycles() {
  const { expiredCount } = await expireOverdueSubscriptions();
  const { remindersSent } = await sendRenewalReminders();
  return { expiredCount, remindersSent };
}
