import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { sha256, randomToken } from "@/server/auth/token";
import * as VerifyRoute from "@/app/api/v1/auth/verify/route";

describe("Email Verification & Auto Sign-in Flow (/api/v1/auth/verify)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifies user, consumes token, creates session with cookie, and redirects to /onboarding", async () => {
    const rawToken = randomToken(32);
    const tokenHash = sha256(rawToken);
    const testEmail = `verify_test_${Date.now()}@leadreach.io`;

    // 1. Create unverified user
    const user = await db.users.create({
      data: {
        email: testEmail,
        email_verified_at: null,
        status: "active",
      },
    });

    // 2. Create verification token
    await db.verification_tokens.create({
      data: {
        identifier: testEmail,
        token_hash: tokenHash,
        purpose: "verify_email",
        expires_at: new Date(Date.now() + 24 * 3600_000),
      },
    });

    // 3. Hit the verification route
    const req = new NextRequest(`http://localhost:3000/api/v1/auth/verify?token=${rawToken}`);
    const res = await VerifyRoute.GET(req);

    // 4. Must redirect to /onboarding
    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/onboarding");

    // 5. Must attach leadreach_session cookie
    const setCookie = res.headers.get("set-cookie") || "";
    expect(setCookie).toContain("leadreach_session=");

    // 6. DB assertions
    const updatedUser = await db.users.findUnique({ where: { id: user.id } });
    expect(updatedUser?.email_verified_at).not.toBeNull();

    const usedToken = await db.verification_tokens.findUnique({ where: { token_hash: tokenHash } });
    expect(usedToken?.used_at).not.toBeNull();

    // 7. Verify session exists in DB
    const session = await db.sessions.findFirst({ where: { user_id: user.id } });
    expect(session).not.toBeNull();
  });

  it("handles already-used token by redirecting to /login with verified flag and email prefill", async () => {
    const rawToken = randomToken(32);
    const tokenHash = sha256(rawToken);
    const testEmail = `already_used_${Date.now()}@leadreach.io`;

    // Verified user
    await db.users.create({
      data: {
        email: testEmail,
        email_verified_at: new Date(),
        status: "active",
      },
    });

    // Already-used token
    await db.verification_tokens.create({
      data: {
        identifier: testEmail,
        token_hash: tokenHash,
        purpose: "verify_email",
        used_at: new Date(),
        expires_at: new Date(Date.now() + 24 * 3600_000),
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/v1/auth/verify?token=${rawToken}`);
    const res = await VerifyRoute.GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login");
    expect(location).toContain("verified=1");
    expect(location).toContain(encodeURIComponent(testEmail));
  });

  it("handles expired token by redirecting to /verify-email?error=expired", async () => {
    const rawToken = randomToken(32);
    const tokenHash = sha256(rawToken);
    const testEmail = `expired_${Date.now()}@leadreach.io`;

    await db.users.create({
      data: {
        email: testEmail,
        email_verified_at: null,
        status: "active",
      },
    });

    // Expired token
    await db.verification_tokens.create({
      data: {
        identifier: testEmail,
        token_hash: tokenHash,
        purpose: "verify_email",
        expires_at: new Date(Date.now() - 3600_000), // 1 hour ago
      },
    });

    const req = new NextRequest(`http://localhost:3000/api/v1/auth/verify?token=${rawToken}`);
    const res = await VerifyRoute.GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/verify-email");
    expect(location).toContain("error=expired");
  });
});

