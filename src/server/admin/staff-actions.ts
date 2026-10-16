"use server";

import { requirePermission } from "@/server/auth/guards";
import { StaffRole, STAFF_ROLES } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import { invalidateUserSessions } from "@/server/auth/session";

/**
 * Invite a new staff member or upgrade an existing user to staff.
 * Restricted strictly to users with 'staff.manage' permission (super_admin).
 */
export async function inviteStaffAction({
  email,
  role,
  name,
}: {
  email: string;
  role: StaffRole;
  name?: string;
}) {
  const currentAdmin = await requirePermission("staff.manage");

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { error: "Please provide a valid email address." };
  }

  if (!STAFF_ROLES.includes(role)) {
    return { error: "Invalid staff role selected." };
  }

  try {
    const existingUser = await db.users.findUnique({
      where: { email: normalizedEmail },
    });

    let targetUserId = "";

    if (existingUser) {
      targetUserId = existingUser.id;
      const beforeState = { role: existingUser.role, status: existingUser.status };

      await db.users.update({
        where: { id: existingUser.id },
        data: {
          role: role as any,
          status: "active",
          ...(name ? { name } : {}),
        },
      });

      await recordAuditLog({
        adminId: currentAdmin.id,
        action: "staff.upgrade_user",
        targetType: "user",
        targetId: existingUser.id,
        beforeState,
        afterState: { role, status: "active", email: normalizedEmail },
      });

      await invalidateUserSessions(existingUser.id);
    } else {
      const newUser = await db.users.create({
        data: {
          email: normalizedEmail,
          name: name || normalizedEmail.split("@")[0],
          role: role as any,
          status: "active",
          email_verified_at: new Date(),
          onboarded_at: new Date(),
        },
      });

      targetUserId = newUser.id;

      await recordAuditLog({
        adminId: currentAdmin.id,
        action: "staff.invite_new",
        targetType: "user",
        targetId: newUser.id,
        afterState: { role, status: "active", email: normalizedEmail },
      });
    }

    return { success: true, message: `Staff invitation granted to ${normalizedEmail} as ${role}.` };
  } catch (err: any) {
    return { error: err?.message || "Failed to process staff invitation." };
  }
}

/**
 * Change the role of an existing staff member.
 * Prevents modifying own role and demoting the last remaining super_admin.
 */
export async function updateStaffRoleAction(targetUserId: string, newRole: StaffRole) {
  const currentAdmin = await requirePermission("staff.manage");

  if (currentAdmin.id === targetUserId) {
    return { error: "Security protection: You cannot change your own role." };
  }

  if (!STAFF_ROLES.includes(newRole)) {
    return { error: "Invalid role selected." };
  }

  try {
    const target = await db.users.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      return { error: "Staff user not found." };
    }

    // Safety check: Cannot demote the last remaining super_admin
    if (target.role === "super_admin" && newRole !== "super_admin") {
      const superAdminCount = await db.users.count({
        where: { role: "super_admin", status: "active" },
      });

      if (superAdminCount <= 1) {
        return { error: "Critical protection: Cannot demote the last remaining Super Admin." };
      }
    }

    const beforeState = { role: target.role };

    await db.users.update({
      where: { id: targetUserId },
      data: { role: newRole as any },
    });

    await recordAuditLog({
      adminId: currentAdmin.id,
      action: "staff.role_change",
      targetType: "user",
      targetId: targetUserId,
      beforeState,
      afterState: { role: newRole },
    });

    await invalidateUserSessions(targetUserId);

    return { success: true, message: `Role updated to ${newRole}.` };
  } catch (err: any) {
    return { error: err?.message || "Failed to update staff role." };
  }
}

/**
 * Toggle staff active or suspended status.
 * Prevents suspending own account and deactivating the last remaining super_admin.
 */
export async function toggleStaffStatusAction(targetUserId: string, newStatus: "active" | "suspended") {
  const currentAdmin = await requirePermission("staff.manage");

  if (currentAdmin.id === targetUserId) {
    return { error: "Security protection: You cannot deactivate your own account." };
  }

  try {
    const target = await db.users.findUnique({
      where: { id: targetUserId },
    });

    if (!target) {
      return { error: "Staff user not found." };
    }

    // Safety check: Cannot deactivate the last remaining super_admin
    if (target.role === "super_admin" && newStatus === "suspended") {
      const activeSuperAdminCount = await db.users.count({
        where: { role: "super_admin", status: "active" },
      });

      if (activeSuperAdminCount <= 1) {
        return { error: "Critical protection: Cannot deactivate the last active Super Admin." };
      }
    }

    const beforeState = { status: target.status };

    await db.users.update({
      where: { id: targetUserId },
      data: { status: newStatus as any },
    });

    await recordAuditLog({
      adminId: currentAdmin.id,
      action: "staff.status_change",
      targetType: "user",
      targetId: targetUserId,
      beforeState,
      afterState: { status: newStatus },
    });

    // Immediately evict sessions so they can't access any page
    await invalidateUserSessions(targetUserId);

    return {
      success: true,
      message: `Staff member has been ${newStatus === "suspended" ? "suspended" : "reactivated"}.`,
    };
  } catch (err: any) {
    return { error: err?.message || "Failed to change staff status." };
  }
}
