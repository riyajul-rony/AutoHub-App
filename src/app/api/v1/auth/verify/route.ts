import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import { sha256, randomToken } from "@/server/auth/token";
import { SESSION_COOKIE, cookieOptions, refreshSessionCache } from "@/server/auth/session";
import { getAppUrl } from "@/server/config";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = await getAppUrl();

  if (!token || !token.trim()) {
    return NextResponse.redirect(new URL("/verify-email", appUrl));
  }

  const tokenHash = sha256(token.trim());

  try {
    const rec = await db.verification_tokens.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!rec || rec.purpose !== "verify_email") {
      return NextResponse.redirect(new URL("/verify-email?error=invalid_token", appUrl));
    }

    // Check if token was already used
    if (rec.used_at) {
      const existingUser = await db.users.findUnique({
        where: { email: rec.identifier },
        select: { id: true, email: true, email_verified_at: true },
      });

      if (existingUser?.email_verified_at) {
        return NextResponse.redirect(
          new URL(
            `/login?verified=1&email=${encodeURIComponent(rec.identifier)}&next=/onboarding`,
            appUrl
          )
        );
      }

      return NextResponse.redirect(
        new URL(
          `/verify-email?error=used&email=${encodeURIComponent(rec.identifier)}`,
          appUrl
        )
      );
    }

    // Check if token expired
    if (rec.expires_at <= new Date()) {
      return NextResponse.redirect(
        new URL(
          `/verify-email?error=expired&email=${encodeURIComponent(rec.identifier)}`,
          appUrl
        )
      );
    }

    // Atomic update of token to prevent double-click race condition
    const updateTokenResult = await db.verification_tokens.updateMany({
      where: { id: rec.id, used_at: null },
      data: { used_at: new Date() },
    });

    if (updateTokenResult.count === 0) {
      // Handled by concurrent request
      const existingUser = await db.users.findUnique({
        where: { email: rec.identifier },
        select: { email_verified_at: true },
      });
      if (existingUser?.email_verified_at) {
        return NextResponse.redirect(
          new URL(
            `/login?verified=1&email=${encodeURIComponent(rec.identifier)}&next=/onboarding`,
            appUrl
          )
        );
      }
      return NextResponse.redirect(
        new URL(`/verify-email?error=used&email=${encodeURIComponent(rec.identifier)}`, appUrl)
      );
    }

    // Mark user as verified
    const existingUser = await db.users.findUnique({
      where: { email: rec.identifier },
    });
    if (!existingUser) {
      return NextResponse.redirect(new URL("/verify-email?error=invalid_token", appUrl));
    }

    const user = await db.users.update({
      where: { id: existingUser.id },
      data: { email_verified_at: new Date() },
    });

    // Invalidate Redis session cache for this user
    await refreshSessionCache(user.id);

    // Create a new persistent DB session for immediate auto sign-in
    const sessionToken = randomToken(32);
    const expires = new Date(Date.now() + 30 * 86_400_000);
    const userAgent = req.headers.get("user-agent")?.slice(0, 255) || undefined;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined;

    await db.sessions.create({
      data: {
        user_id: user.id,
        token_hash: sha256(sessionToken),
        expires_at: expires,
        user_agent: userAgent,
        ip: ip,
      },
    });

    logger.info({ userId: user.id, email: user.email }, "Email successfully verified and session created");

    // Redirect straight to onboarding (or app if already onboarded)
    const target = user.onboarded_at ? "/app" : "/onboarding";
    const res = NextResponse.redirect(new URL(target, appUrl));

    // Set HTTP session cookie on response
    res.cookies.set(SESSION_COOKIE, sessionToken, cookieOptions(expires));

    return res;
  } catch (err: any) {
    logger.error({ err: err?.message, stack: err?.stack }, "Failed to verify email token");
    return NextResponse.redirect(new URL("/verify-email?error=server_error", appUrl));
  }
}
