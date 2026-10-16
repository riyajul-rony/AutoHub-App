"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";

export interface RecordManualPaymentInput {
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  method: string; // e.g. "bKash", "Nagad", "Bank", "Crypto"
  transactionId?: string;
  durationMonths: number;
  note?: string;
}

export async function recordManualPaymentAction(input: RecordManualPaymentInput) {
  const admin = await requirePermission("billing.manage");

  if (!input.userId || !input.planId || input.amount < 0) {
    return { success: false, error: "Invalid payment details provided." };
  }

  const user = await db.users.findUnique({ where: { id: input.userId } });
  if (!user) {
    return { success: false, error: "User not found." };
  }

  const plan = await db.plans.findUnique({ where: { id: input.planId } });
  if (!plan) {
    return { success: false, error: "Target plan not found." };
  }

  const now = new Date();
  const months = Math.max(1, input.durationMonths || 1);
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + months);

  // 1. Create or extend subscription
  let subscription = await db.subscriptions.findFirst({
    where: {
      user_id: user.id,
      status: { in: ["active", "trialing", "past_due"] },
    },
  });

  const beforeSub = subscription ? { ...subscription } : null;

  if (subscription) {
    const currentEnd = new Date(subscription.current_period_end);
    const newEnd = currentEnd > now ? new Date(currentEnd) : new Date(now);
    newEnd.setMonth(newEnd.getMonth() + months);

    subscription = await db.subscriptions.update({
      where: { id: subscription.id },
      data: {
        plan_id: plan.id,
        status: "active",
        current_period_end: newEnd,
        cancel_at_period_end: false,
      },
    });
  } else {
    subscription = await db.subscriptions.create({
      data: {
        user_id: user.id,
        plan_id: plan.id,
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

  // 3. Create succeeded payment record
  const payment = await db.payments.create({
    data: {
      user_id: user.id,
      subscription_id: subscription.id,
      amount: input.amount,
      currency: input.currency || "USD",
      status: "succeeded",
      provider: "manual",
      provider_payment_id: input.transactionId || `trx_${Date.now()}`,
      invoice_number: invoiceNumber,
      paid_at: now,
      method_details: {
        method: input.method || "manual",
        transaction_id: input.transactionId,
        plan_name: plan.name,
        months,
        note: input.note || "Manual verification by administrator",
        verified_by: admin.email,
      },
    },
  });

  // 4. Update user active plan
  await db.users.update({
    where: { id: user.id },
    data: {
      plan: plan.slug,
      plan_id: plan.id,
    },
  });

  // 5. In-app notification to user
  await db.notifications.create({
    data: {
      user_id: user.id,
      type: "manual_payment_confirmed",
      title: `✅ Payment Verified (${plan.name})`,
      body: `Your payment of ${input.currency} ${input.amount} has been verified. Your ${plan.name} plan is active through ${subscription.current_period_end.toLocaleDateString()}.`,
      entity_type: "payment",
      entity_id: payment.id,
    },
  }).catch(() => null);

  // 6. Record admin audit log
  await recordAuditLog({
    adminId: admin.id,
    action: "billing.manual_payment_recorded",
    targetType: "payment",
    targetId: payment.id,
    beforeState: beforeSub,
    afterState: {
      paymentId: payment.id,
      invoiceNumber,
      amount: input.amount,
      currency: input.currency,
      userId: user.id,
      planSlug: plan.slug,
      method: input.method,
      newPeriodEnd: subscription.current_period_end,
    },
  });

  revalidatePath("/admin/billing");
  revalidatePath("/app/settings/billing");
  revalidatePath(`/admin/users/${user.id}`);

  return { success: true, paymentId: payment.id, invoiceNumber };
}

export async function changeSubscriptionPlanAction(input: {
  subscriptionId: string;
  planId: string;
  extendDays?: number;
  status?: "active" | "canceled" | "expired";
}) {
  const admin = await requirePermission("billing.manage");

  const sub = await db.subscriptions.findUnique({
    where: { id: input.subscriptionId },
  });
  if (!sub) return { success: false, error: "Subscription not found." };

  const targetPlan = await db.plans.findUnique({
    where: { id: input.planId },
  });
  if (!targetPlan) return { success: false, error: "Target plan not found." };

  const beforeState = { ...sub };

  const updateData: any = {
    plan_id: targetPlan.id,
  };

  if (input.status) {
    updateData.status = input.status;
  }

  if (input.extendDays && input.extendDays > 0) {
    const currentEnd = new Date(sub.current_period_end);
    const baseDate = currentEnd > new Date() ? currentEnd : new Date();
    baseDate.setDate(baseDate.getDate() + input.extendDays);
    updateData.current_period_end = baseDate;
  }

  const updatedSub = await db.subscriptions.update({
    where: { id: sub.id },
    data: updateData,
  });

  // Update user's plan pointer
  await db.users.update({
    where: { id: sub.user_id },
    data: {
      plan: targetPlan.slug,
      plan_id: targetPlan.id,
    },
  });

  await recordAuditLog({
    adminId: admin.id,
    action: "billing.subscription_updated",
    targetType: "subscription",
    targetId: sub.id,
    beforeState,
    afterState: updatedSub,
  });

  revalidatePath("/admin/billing");
  revalidatePath("/app/settings/billing");
  return { success: true };
}

export async function cancelSubscriptionAction(subscriptionId: string) {
  const admin = await requirePermission("billing.manage");

  const sub = await db.subscriptions.findUnique({
    where: { id: subscriptionId },
  });
  if (!sub) return { success: false, error: "Subscription not found." };

  const beforeState = { ...sub };

  const updated = await db.subscriptions.update({
    where: { id: subscriptionId },
    data: {
      status: "canceled",
      cancel_at_period_end: true,
    },
  });

  await recordAuditLog({
    adminId: admin.id,
    action: "billing.subscription_canceled",
    targetType: "subscription",
    targetId: subscriptionId,
    beforeState,
    afterState: updated,
  });

  revalidatePath("/admin/billing");
  revalidatePath("/app/settings/billing");
  return { success: true };
}

export async function markPaymentRefundAction(paymentId: string, reason: string) {
  const admin = await requirePermission("billing.manage");

  const payment = await db.payments.findUnique({
    where: { id: paymentId },
  });
  if (!payment) return { success: false, error: "Payment not found." };

  const beforeState = { ...payment };

  const updated = await db.payments.update({
    where: { id: paymentId },
    data: {
      status: "refunded",
      refunded_at: new Date(),
      refund_reason: reason || "Administrative refund issued",
    },
  });

  await recordAuditLog({
    adminId: admin.id,
    action: "billing.payment_refunded",
    targetType: "payment",
    targetId: paymentId,
    beforeState,
    afterState: updated,
  });

  revalidatePath("/admin/billing");
  revalidatePath("/app/settings/billing");
  return { success: true };
}
