"use server";

import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { getSessionUser, invalidateUserSessions } from "@/server/auth/session";
import { assertPermission } from "@/server/auth/guards";
import { hasPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import { randomToken, sha256 } from "@/server/auth/token";
import { getAppUrl } from "@/server/config";
import { sendSystemMail } from "@/server/email/system-mailer";
import { rateLimit } from "@/server/security/rate-limit";
import { decrypt } from "@/server/crypto";
import { removeAvatar } from "@/server/storage/avatar";
import { cancelUserJobs } from "@/server/queues/manager";
import { logger } from "@/server/logger";

const VALID_PLANS = ["free", "starter", "pro", "enterprise"];

/**
 * Suspend a user account.
 * Immediately invalidates all active sessions (force logout) and pauses any running campaigns.
 */
export async function suspendUserAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  if (session.user.id === targetUserId) {
    throw new Error("Security Violation: You cannot suspend your own administrative account.");
  }

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!target) throw new Error("User not found.");

  if (target.role === "super_admin") {
    const superAdminCount = await db.users.count({
      where: { role: "super_admin", status: "active" },
    });
    if (superAdminCount <= 1) {
      throw new Error("Safety Protection: Cannot suspend the last remaining active Super Admin.");
    }
  }

  // 1. Update user status
  await db.users.update({
    where: { id: targetUserId },
    data: { status: "suspended" },
  });

  // 2. Invalidate all sessions in Redis and DB
  await invalidateUserSessions(targetUserId);

  // 3. Pause active social campaigns
  await db.social_campaigns.updateMany({
    where: { user_id: targetUserId, status: "active" },
    data: { status: "paused" },
  }).catch(() => null);

  // 4. Pause active outreach campaigns
  await db.outreach_campaigns.updateMany({
    where: { user_id: targetUserId, status: "running" },
    data: { status: "paused" },
  }).catch(() => null);

  await db.outreach_campaigns.updateMany({
    where: { user_id: targetUserId, status: "scheduled" },
    data: { status: "paused" },
  }).catch(() => null);

  // 5. Cancel or skip pending post runs
  await db.post_runs.updateMany({
    where: { user_id: targetUserId, status: { in: ["scheduled", "generating"] } },
    data: { status: "skipped", error_message: "User account suspended by administrator." },
  }).catch(() => null);

  // 6. Record Audit Log
  await recordAuditLog({
    adminId: session.user.id,
    action: "user.suspend",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { status: target.status },
    afterState: { status: "suspended" },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `User ${target.email} has been suspended, active sessions revoked, and campaigns paused.` };
}

/**
 * Activate a suspended or pending user account.
 */
export async function activateUserAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, status: true },
  });

  if (!target) throw new Error("User not found.");

  await db.users.update({
    where: { id: targetUserId },
    data: { status: "active" },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.activate",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { status: target.status },
    afterState: { status: "active" },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `User ${target.email} has been activated.` };
}

/**
 * Update user role.
 */
export async function updateUserRoleAction(targetUserId: string, newRole: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");

  const isStaffRole = ["super_admin", "admin", "support", "finance"].includes(newRole);
  if (isStaffRole) {
    assertPermission(session.user.role, "staff.manage");
  } else {
    assertPermission(session.user.role, "users.manage");
  }

  if (session.user.id === targetUserId && session.user.role === "super_admin" && newRole !== "super_admin") {
    throw new Error("Security Violation: You cannot demote your own Super Admin account.");
  }

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true },
  });

  if (!target) throw new Error("User not found.");

  if (target.role === "super_admin" && newRole !== "super_admin") {
    const superAdminCount = await db.users.count({
      where: { role: "super_admin", status: "active" },
    });
    if (superAdminCount <= 1) {
      throw new Error("Safety Protection: Cannot demote the last remaining active Super Admin.");
    }
  }

  await db.users.update({
    where: { id: targetUserId },
    data: { role: newRole as any },
  });

  // Evict cache so updated role applies instantly
  await invalidateUserSessions(targetUserId);

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.role_change",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { role: target.role },
    afterState: { role: newRole },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `Role updated to ${newRole} for ${target.email}.` };
}

/**
 * Update user subscription plan.
 */
export async function updateUserPlanAction(targetUserId: string, newPlan: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  const cleanPlan = newPlan.toLowerCase().trim();
  const planRecord = await db.plans.findFirst({
    where: { slug: cleanPlan },
  });

  if (!planRecord && !VALID_PLANS.includes(cleanPlan)) {
    throw new Error(`Invalid plan tier: "${cleanPlan}".`);
  }

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, plan: true },
  });

  if (!target) throw new Error("User not found.");

  await db.users.update({
    where: { id: targetUserId },
    data: {
      plan: cleanPlan,
      plan_id: planRecord ? planRecord.id : null,
    },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.plan_change",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { plan: target.plan },
    afterState: { plan: cleanPlan },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `Plan tier updated to ${cleanPlan} for ${target.email}.` };
}

/**
 * Mark user's email as manually verified.
 */
export async function verifyUserEmailAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, email_verified_at: true },
  });

  if (!target) throw new Error("User not found.");

  const now = new Date();
  await db.users.update({
    where: { id: targetUserId },
    data: { email_verified_at: now },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.verify_email",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { email_verified_at: target.email_verified_at },
    afterState: { email_verified_at: now.toISOString() },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `Email for ${target.email} has been manually marked as verified.` };
}

/**
 * Generate password reset token and send reset email.
 */
export async function sendPasswordResetAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });

  if (!target) throw new Error("User not found.");

  const rawToken = randomToken(32);
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.verification_tokens.create({
    data: {
      identifier: target.email,
      purpose: "reset_password",
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  });

  const appUrl = await getAppUrl();
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

  const mailResult = await sendSystemMail({
    to: target.email,
    subject: "Reset your Lead Reach AI password",
    text: `An administrator has initiated a password reset for your Lead Reach AI account.\n\nReset your password here:\n${resetUrl}\n\nThis link is valid for 1 hour. If you did not expect this, please contact support.`,
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.password_reset_sent",
    targetType: "user",
    targetId: targetUserId,
    afterState: { email: target.email, sent: mailResult.ok },
  });

  return {
    ok: true,
    message: mailResult.ok
      ? `Password reset link sent to ${target.email}.`
      : `Reset token created. SMTP fallback: ${resetUrl}`,
  };
}

/**
 * Revoke all active sessions for a user (forces logout across all devices).
 */
export async function revokeAllSessionsAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true },
  });

  if (!target) throw new Error("User not found.");

  await invalidateUserSessions(targetUserId);

  await recordAuditLog({
    adminId: session.user.id,
    action: "user.sessions_revoked",
    targetType: "user",
    targetId: targetUserId,
  });

  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `All active sessions for ${target.email} have been revoked.` };
}

/**
 * Soft delete a user account (sets status to pending_delete).
 * Admin cannot delete self; cannot delete last super_admin.
 */
export async function softDeleteUserAction(targetUserId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "users.manage");

  if (session.user.id === targetUserId) {
    throw new Error("Security Violation: You cannot delete your own administrative account.");
  }

  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: { id: true, email: true, role: true, status: true },
  });

  if (!target) throw new Error("User not found.");

  if (target.role === "super_admin") {
    const superAdminCount = await db.users.count({
      where: { role: "super_admin", status: "active" },
    });
    if (superAdminCount <= 1) {
      throw new Error("Safety Protection: Cannot delete the last remaining active Super Admin.");
    }
  }

  const now = new Date();

  // 1. Mark as pending_delete
  await db.users.update({
    where: { id: targetUserId },
    data: {
      status: "pending_delete",
      deletion_requested_at: now,
    },
  });

  // 2. Terminate all active sessions
  await invalidateUserSessions(targetUserId);

  // 3. Pause all active campaigns
  await db.social_campaigns.updateMany({
    where: { user_id: targetUserId, status: "active" },
    data: { status: "paused" },
  }).catch(() => null);

  await db.outreach_campaigns.updateMany({
    where: { user_id: targetUserId, status: "running" },
    data: { status: "paused" },
  }).catch(() => null);

  await db.outreach_campaigns.updateMany({
    where: { user_id: targetUserId, status: "scheduled" },
    data: { status: "paused" },
  }).catch(() => null);

  // 4. Cancel scheduled runs
  await db.post_runs.updateMany({
    where: { user_id: targetUserId, status: { in: ["scheduled", "generating"] } },
    data: { status: "skipped", error_message: "User account scheduled for deletion." },
  }).catch(() => null);

  // 5. Audit Log
  await recordAuditLog({
    adminId: session.user.id,
    action: "user.soft_delete",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { status: target.status },
    afterState: { status: "pending_delete", deletion_requested_at: now.toISOString() },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${targetUserId}`);
  return { ok: true, message: `User ${target.email} marked as pending_delete and access terminated.` };
}

async function revokeGoogleOAuthToken(encryptedToken?: string | null): Promise<void> {
  if (!encryptedToken) return;
  try {
    const rawToken = decrypt(encryptedToken);
    if (!rawToken) return;
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(rawToken)}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(3000),
    }).catch(() => null);
  } catch {
    // Fail-safe: ignore network errors during token revocation
  }
}

/**
 * Permanently deletes a user account and all cascading data from the database.
 * Restricted to super_admin only. Cannot delete self or other administrative/staff accounts.
 * Revokes Google OAuth tokens, cancels BullMQ jobs, deletes uploaded media files from disk,
 * and records an anonymized audit log (SHA-256 hash only).
 */
export async function hardDeleteUserAction(targetUserId: string, confirmationEmail: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");

  // 1. Super Admin Only check
  if (session.user.role !== "super_admin") {
    throw new Error("Security Violation: Only Super Admins are permitted to permanently delete user accounts.");
  }

  // 2. Cannot delete self
  if (session.user.id === targetUserId) {
    throw new Error("Security Violation: You cannot delete your own administrative account.");
  }

  // 3. Rate limiting (max 5 deletions per minute per super admin)
  const rl = await rateLimit(`admin:hard_delete:${session.user.id}`, 5, 60_000);
  if (!rl.ok) {
    throw new Error("Rate limit exceeded: Too many deletion attempts. Please wait a moment.");
  }

  // 4. Fetch target user
  const target = await db.users.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      email: true,
      role: true,
      plan: true,
      avatar_url: true,
      status: true,
    },
  });

  if (!target) {
    throw new Error("User not found.");
  }

  // 5. Cannot delete staff / admins directly
  if (target.role !== "user") {
    throw new Error("Security Violation: Administrative and staff accounts cannot be deleted with this action. Demote to regular user first.");
  }

  // 6. Confirmation email must match exact email
  if (confirmationEmail?.trim().toLowerCase() !== target.email.toLowerCase()) {
    throw new Error(`Email mismatch. You must type "${target.email}" exactly to confirm permanent deletion.`);
  }

  // 7. Revoke Google OAuth tokens
  try {
    const googleConns = await db.google_connections.findMany({
      where: { user_id: targetUserId },
      select: { access_token_enc: true, refresh_token_enc: true },
    }).catch(() => []);
    for (const conn of googleConns) {
      await revokeGoogleOAuthToken(conn.refresh_token_enc || conn.access_token_enc);
    }

    const emailAccounts = await db.email_accounts.findMany({
      where: { user_id: targetUserId, provider: "gmail_api" },
      select: { oauth_access_token_enc: true, oauth_refresh_token_enc: true },
    }).catch(() => []);
    for (const acc of emailAccounts) {
      await revokeGoogleOAuthToken(acc.oauth_refresh_token_enc || acc.oauth_access_token_enc);
    }
  } catch (err) {
    logger.warn({ err, targetUserId }, "Error revoking Google OAuth tokens during hard delete");
  }

  // 8. Cancel running / delayed BullMQ jobs
  try {
    await cancelUserJobs(targetUserId);
  } catch (err) {
    logger.warn({ err, targetUserId }, "Error cancelling user BullMQ jobs during hard delete");
  }

  // 9. Clean up uploaded storage files (avatar & assets)
  try {
    if (target.avatar_url) {
      await removeAvatar(target.avatar_url).catch(() => null);
    }
    const userAssets = await db.assets.findMany({
      where: { user_id: targetUserId },
      select: { path: true },
    }).catch(() => []);
    for (const asset of userAssets) {
      if (asset?.path) {
        await fs.promises.unlink(path.resolve(asset.path)).catch(() => null);
      }
    }
  } catch (err) {
    logger.warn({ err, targetUserId }, "Error cleaning up user storage files during hard delete");
  }

  // 10. Invalidate Redis and active DB sessions immediately
  await invalidateUserSessions(targetUserId).catch(() => null);

  // 11. Transactional Database Deletion
  await db.$transaction(async (tx: any) => {
    // Explicit delete of verification / reset tokens (identifier is email, not FK)
    await tx.verification_tokens.deleteMany({
      where: { identifier: target.email },
    });

    // Delete the user record (cascades to all foreign keys via onDelete: Cascade)
    await tx.users.delete({
      where: { id: targetUserId },
    });
  });

  // 12. Record Audit Log WITHOUT personal data (SHA-256 hash of email, admin ID, timestamp)
  const emailHash = sha256(target.email.toLowerCase().trim());
  await recordAuditLog({
    adminId: session.user.id,
    action: "user.hard_delete_permanent",
    targetType: "user",
    targetId: targetUserId,
    beforeState: { emailHash, role: target.role, plan: target.plan },
    afterState: { deleted: true, emailHash, timestamp: new Date().toISOString() },
  });

  try {
    revalidatePath("/admin/users");
  } catch {}
  return {
    ok: true,
    message: `User ${target.email} and all associated records have been permanently deleted.`,
  };
}
