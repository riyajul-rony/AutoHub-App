import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/server/db";
import { hardDeleteUserAction } from "@/server/admin/user-actions";
import * as sessionModule from "@/server/auth/session";

describe("Admin Permanent Hard Delete Flow (hardDeleteUserAction)", () => {
  let mockCurrentAdmin: any = {
    user: { id: "admin_super_1", email: "superadmin@leadreach.io", role: "super_admin" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentAdmin = {
      user: { id: "admin_super_1", email: "superadmin@leadreach.io", role: "super_admin" },
    };
    vi.spyOn(sessionModule, "getSessionUser").mockImplementation(async () => mockCurrentAdmin);
  });

  it("blocks non-super-admins from deleting users", async () => {
    mockCurrentAdmin = {
      user: { id: "admin_regular_1", email: "admin@leadreach.io", role: "admin" },
    };

    await expect(
      hardDeleteUserAction("any_user_id", "test@leadreach.io")
    ).rejects.toThrow("Security Violation: Only Super Admins are permitted to permanently delete user accounts.");
  });

  it("prevents super admin from deleting their own administrative account", async () => {
    await expect(
      hardDeleteUserAction("admin_super_1", "superadmin@leadreach.io")
    ).rejects.toThrow("Security Violation: You cannot delete your own administrative account.");
  });

  it("prevents deleting other staff/admin accounts with this button", async () => {
    const staffUser = await db.users.create({
      data: {
        id: `staff_${Date.now()}`,
        email: `staff_${Date.now()}@leadreach.io`,
        role: "admin",
        status: "active",
      },
    });

    await expect(
      hardDeleteUserAction(staffUser.id, staffUser.email)
    ).rejects.toThrow("Security Violation: Administrative and staff accounts cannot be deleted with this action.");
  });

  it("rejects deletion when typed confirmation email does not match", async () => {
    const targetUser = await db.users.create({
      data: {
        id: `target_mismatch_${Date.now()}`,
        email: `victim_${Date.now()}@leadreach.io`,
        role: "user",
        status: "active",
      },
    });

    await expect(
      hardDeleteUserAction(targetUser.id, "wrong-email@leadreach.io")
    ).rejects.toThrow("Email mismatch. You must type");
  });

  it("permanently deletes user, cascades data, and permits re-signup with same email", async () => {
    const testEmail = `hard_delete_e2e_${Date.now()}@leadreach.io`;
    const targetUserId = `user_hard_delete_${Date.now()}`;

    // 1. Create target user
    const user = await db.users.create({
      data: {
        id: targetUserId,
        email: testEmail,
        role: "user",
        status: "active",
      },
    });

    // 2. Attach session
    await db.sessions.create({
      data: {
        id: `sess_${Date.now()}`,
        user_id: user.id,
        session_token: "test_token_hard_delete",
        expires_at: new Date(Date.now() + 3600_000),
      },
    });

    // 3. Attach verification token
    await db.verification_tokens.create({
      data: {
        identifier: testEmail,
        token_hash: `hash_${Date.now()}`,
        purpose: "verify_email",
        expires_at: new Date(Date.now() + 3600_000),
      },
    });

    // 4. Verify data exists before hard delete
    expect(await db.users.findUnique({ where: { id: user.id } })).not.toBeNull();
    expect(await db.verification_tokens.findFirst({ where: { identifier: testEmail } })).not.toBeNull();

    // 5. Execute permanent hard delete
    const result = await hardDeleteUserAction(user.id, testEmail);
    expect(result.ok).toBe(true);

    // 6. Confirm user and verification tokens are wiped completely
    const deletedUser = await db.users.findUnique({ where: { id: user.id } });
    expect(deletedUser).toBeNull();

    const leftoverToken = await db.verification_tokens.findFirst({ where: { identifier: testEmail } });
    expect(leftoverToken).toBeNull();

    // 7. Verify new signup with exact same email succeeds without collision!
    const reSignupUser = await db.users.create({
      data: {
        email: testEmail,
        role: "user",
        status: "active",
      },
    });
    expect(reSignupUser).not.toBeNull();
    expect(reSignupUser.email).toBe(testEmail);
  });
});

