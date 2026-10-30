"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth/session";
import { assertPermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";

export interface PlanFormData {
  name: string;
  slug: string;
  description?: string | null;
  monthly_price?: number;
  price_monthly?: number;
  yearly_price?: number;
  price_yearly?: number;
  currency: string;
  is_active: boolean;
  features: string[];
  monthly_leads: number;
  monthly_social_posts: number;
  monthly_outreach_emails: number;
  daily_outreach_emails?: number;
  monthly_ai_outreach_emails?: number;
  max_social_accounts: number;
  max_email_accounts: number;
  max_campaigns: number;
}

export interface UserLimitOverridesData {
  monthly_leads?: number | null;
  monthly_social_posts?: number | null;
  monthly_outreach_emails?: number | null;
  daily_outreach_emails?: number | null;
  monthly_ai_outreach_emails?: number | null;
  max_social_accounts?: number | null;
  max_email_accounts?: number | null;
  max_campaigns?: number | null;
}

/**
 * Create a new subscription plan tier.
 */
export async function createPlanAction(data: PlanFormData) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "plans.manage");

  const cleanSlug = data.slug.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
  if (!cleanSlug) throw new Error("A valid unique slug is required (e.g. pro-plus).");

  const existing = await db.plans.findUnique({ where: { slug: cleanSlug } });
  if (existing) throw new Error(`A plan with slug "${cleanSlug}" already exists.`);

  const mPrice = data.price_monthly ?? data.monthly_price ?? 0;
  const yPrice = data.price_yearly ?? data.yearly_price ?? 0;

  const plan = await db.plans.create({
    data: {
      name: data.name.trim(),
      slug: cleanSlug,
      description: data.description || null,
      price_monthly: mPrice,
      price_yearly: yPrice,
      monthly_price: mPrice,
      yearly_price: yPrice,
      currency: (data.currency || "USD").toUpperCase(),
      is_active: data.is_active ?? true,
      features: data.features || [],
      monthly_leads: Number(data.monthly_leads) || 100,
      monthly_social_posts: Number(data.monthly_social_posts) || 30,
      monthly_outreach_emails: Number(data.monthly_outreach_emails) || 100,
      daily_outreach_emails: Number(data.daily_outreach_emails) || 50,
      monthly_ai_outreach_emails: Number(data.monthly_ai_outreach_emails) || 50,
      max_social_accounts: Number(data.max_social_accounts) || 2,
      max_email_accounts: Number(data.max_email_accounts) || 1,
      max_campaigns: Number(data.max_campaigns) || 2,
    },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "plan.create",
    targetType: "plan",
    targetId: plan.id,
    afterState: { name: plan.name, slug: plan.slug, price_monthly: mPrice },
  });

  revalidatePath("/admin/plans");
  return { ok: true, message: `Plan "${plan.name}" created successfully.`, plan };
}

/**
 * Update an existing subscription plan tier.
 */
export async function updatePlanAction(planId: string, data: Partial<PlanFormData>) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "plans.manage");

  const existing = await db.plans.findUnique({ where: { id: planId } });
  if (!existing) throw new Error("Plan not found.");

  const updatePayload: any = {};
  if (data.name !== undefined) updatePayload.name = data.name.trim();
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.price_monthly !== undefined || data.monthly_price !== undefined) {
    const val = data.price_monthly ?? data.monthly_price;
    updatePayload.price_monthly = val;
    updatePayload.monthly_price = val;
  }
  if (data.price_yearly !== undefined || data.yearly_price !== undefined) {
    const val = data.price_yearly ?? data.yearly_price;
    updatePayload.price_yearly = val;
    updatePayload.yearly_price = val;
  }
  if (data.currency !== undefined) updatePayload.currency = data.currency.toUpperCase();
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
  if (data.features !== undefined) updatePayload.features = data.features;
  if (data.monthly_leads !== undefined) updatePayload.monthly_leads = Number(data.monthly_leads);
  if (data.monthly_social_posts !== undefined) updatePayload.monthly_social_posts = Number(data.monthly_social_posts);
  if (data.monthly_outreach_emails !== undefined) updatePayload.monthly_outreach_emails = Number(data.monthly_outreach_emails);
  if (data.daily_outreach_emails !== undefined) updatePayload.daily_outreach_emails = Number(data.daily_outreach_emails);
  if (data.monthly_ai_outreach_emails !== undefined) updatePayload.monthly_ai_outreach_emails = Number(data.monthly_ai_outreach_emails);
  if (data.max_social_accounts !== undefined) updatePayload.max_social_accounts = Number(data.max_social_accounts);
  if (data.max_email_accounts !== undefined) updatePayload.max_email_accounts = Number(data.max_email_accounts);
  if (data.max_campaigns !== undefined) updatePayload.max_campaigns = Number(data.max_campaigns);

  const updated = await db.plans.update({
    where: { id: planId },
    data: updatePayload,
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "plan.update",
    targetType: "plan",
    targetId: planId,
    beforeState: { name: existing.name, price_monthly: existing.price_monthly },
    afterState: { name: updated.name, price_monthly: updated.price_monthly },
  });

  revalidatePath("/admin/plans");
  return { ok: true, message: `Plan "${updated.name}" updated successfully.`, plan: updated };
}

/**
 * Toggle plan active status (activate / deactivate).
 */
export async function togglePlanStatusAction(planId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "plans.manage");

  const existing = await db.plans.findUnique({ where: { id: planId } });
  if (!existing) throw new Error("Plan not found.");

  const nextStatus = !existing.is_active;
  await db.plans.update({
    where: { id: planId },
    data: { is_active: nextStatus },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "plan.toggle_status",
    targetType: "plan",
    targetId: planId,
    beforeState: { is_active: existing.is_active },
    afterState: { is_active: nextStatus },
  });

  revalidatePath("/admin/plans");
  return {
    ok: true,
    message: `Plan "${existing.name}" is now ${nextStatus ? "active" : "deactivated"}.`,
  };
}

/**
 * Delete a plan.
 * Safe-check: Cannot delete a plan if any active users are currently assigned to it.
 */
export async function deletePlanAction(planId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "plans.manage");

  const existing = await db.plans.findUnique({ where: { id: planId } });
  if (!existing) throw new Error("Plan not found.");

  // Check if users are assigned to this plan
  const assignedUsersCount = await db.users.count({
    where: {
      OR: [
        { plan: existing.slug },
        { plan_id: existing.id },
      ],
    },
  });

  if (assignedUsersCount > 0) {
    throw new Error(
      `Cannot delete plan "${existing.name}": ${assignedUsersCount} active user(s) are currently subscribed to it. Deactivate the plan instead.`
    );
  }

  await db.plans.delete({ where: { id: planId } });

  await recordAuditLog({
    adminId: session.user.id,
    action: "plan.delete",
    targetType: "plan",
    targetId: planId,
    beforeState: { name: existing.name, slug: existing.slug },
  });

  revalidatePath("/admin/plans");
  return { ok: true, message: `Plan "${existing.name}" has been deleted.` };
}

/**
 * Set custom limit overrides for a specific user.
 */
export async function updateUserLimitOverridesAction(
  targetUserId: string,
  overrides: UserLimitOverridesData
) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "plans.manage");

  const targetUser = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });
  if (!targetUser) throw new Error("User not found.");

  // Clean data: parse numbers or null
  const payload = {
    monthly_leads: overrides.monthly_leads != null && overrides.monthly_leads >= 0 ? Number(overrides.monthly_leads) : null,
    monthly_social_posts: overrides.monthly_social_posts != null && overrides.monthly_social_posts >= 0 ? Number(overrides.monthly_social_posts) : null,
    monthly_outreach_emails: overrides.monthly_outreach_emails != null && overrides.monthly_outreach_emails >= 0 ? Number(overrides.monthly_outreach_emails) : null,
    daily_outreach_emails: overrides.daily_outreach_emails != null && overrides.daily_outreach_emails >= 0 ? Number(overrides.daily_outreach_emails) : null,
    monthly_ai_outreach_emails: overrides.monthly_ai_outreach_emails != null && overrides.monthly_ai_outreach_emails >= 0 ? Number(overrides.monthly_ai_outreach_emails) : null,
    max_social_accounts: overrides.max_social_accounts != null && overrides.max_social_accounts >= 0 ? Number(overrides.max_social_accounts) : null,
    max_email_accounts: overrides.max_email_accounts != null && overrides.max_email_accounts >= 0 ? Number(overrides.max_email_accounts) : null,
    max_campaigns: overrides.max_campaigns != null && overrides.max_campaigns >= 0 ? Number(overrides.max_campaigns) : null,
  };

  const updatedOverride = await db.user_limit_overrides.upsert({
    where: { user_id: targetUserId },
    create: {
      user_id: targetUserId,
      ...payload,
    },
    update: payload,
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.limits_override_update",
    targetType: "user",
    targetId: targetUserId,
    afterState: payload,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath("/app/dashboard");
  return { ok: true, message: `Custom limit overrides saved for ${targetUser.email}.`, overrides: updatedOverride };
}
