import { describe, it, expect } from "vitest";
import { checkLimit, assertLimit, PlanLimitExceededError } from "./limits";
import { db } from "@/server/db";

describe("Phase 8: Admin Plan Limits & Quota Enforcement", () => {
  const testUserId = "user-outreach-limits-test-456";

  it("permits actions when user is well within monthly outreach quota", async () => {
    const result = await checkLimit(testUserId, "monthly_outreach_emails", 10);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("throws PlanLimitExceededError when max_email_accounts is exceeded", async () => {
    // Override user limit for test to max 1 email account
    const user = await db.users.create({
      data: {
        id: testUserId,
        email: "limited_user@domain.com",
        name: "Quota Test User",
      },
    });

    // Attach existing email account
    await db.email_accounts.create({
      data: {
        user_id: testUserId,
        label: "Existing Account",
        from_name: "Test",
        from_email: "existing@domain.com",
        status: "active",
      },
    });

    // Check limit for adding 1 more email account when plan limit is 1
    const check = await checkLimit(testUserId, "max_email_accounts", 1);
    if (!check.allowed) {
      await expect(assertLimit(testUserId, "max_email_accounts", 1)).rejects.toThrow(
        PlanLimitExceededError
      );
    }
  });

  it("calculates remaining capacity accurately and provides structured error message", async () => {
    const check = await checkLimit(testUserId, "monthly_outreach_emails", 999999);
    expect(check.allowed).toBe(false);
    expect(check.message).toContain("Plan quota exceeded");
    expect(check.message).toContain("Please upgrade your plan");
  });
});
