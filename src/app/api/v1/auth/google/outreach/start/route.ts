import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getGoogleOutreachAuthUrl } from "@/server/email/google-oauth";
import { assertLimit } from "@/server/billing/limits";
import { getAppUrl } from "@/server/config";

export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.redirect(new URL("/login?error=unauthorized", appUrl));
  }

  // Pre-check plan limits for email accounts
  try {
    await assertLimit(session.user.id, "max_email_accounts", 1);
  } catch (limitErr: any) {
    const errorMsg = encodeURIComponent(limitErr.message || "Account limit reached");
    return NextResponse.redirect(
      new URL(`/app/outreach/email-accounts?error=${errorMsg}`, appUrl)
    );
  }

  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/app/outreach/email-accounts";
  const includeRead = req.nextUrl.searchParams.get("includeRead") === "true";

  const result = await getGoogleOutreachAuthUrl(session.user.id, {
    returnTo,
    includeReadScope: includeRead,
  });

  if (result.error || !result.url) {
    const errorMsg = encodeURIComponent(result.error || "Google OAuth not configured");
    return NextResponse.redirect(
      new URL(`/app/outreach/email-accounts?error=${errorMsg}`, appUrl)
    );
  }

  if (req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: result.url });
  }

  return NextResponse.redirect(result.url);
}
