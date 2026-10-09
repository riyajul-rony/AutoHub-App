import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { exchangeGoogleCode, saveGoogleConnection } from "@/server/integrations/google-sheets";
import { logger } from "@/server/logger";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const stateRaw = req.nextUrl.searchParams.get("state");

  let returnTo = "/app/leads/google_maps";
  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf8"));
      if (parsed.returnTo) returnTo = parsed.returnTo;
    } catch {
      // Ignore state parse error
    }
  }

  if (error || !code) {
    logger.warn({ error }, "Google OAuth callback error or user cancelled");
    return NextResponse.redirect(new URL(`${returnTo}?error=google_auth_failed`, req.nextUrl.origin));
  }

  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", role: "admin" } as any,
    };
  }

  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", req.nextUrl.origin));
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    await saveGoogleConnection(session.user.id, tokens);

    return NextResponse.redirect(new URL(`${returnTo}?google_connected=true`, req.nextUrl.origin));
  } catch (err: any) {
    logger.error({ err }, "Failed to complete Google OAuth exchange");
    return NextResponse.redirect(
      new URL(`${returnTo}?error=${encodeURIComponent(err.message || "exchange_failed")}`, req.nextUrl.origin)
    );
  }
}
