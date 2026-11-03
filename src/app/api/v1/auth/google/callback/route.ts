import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, createSession } from "@/server/auth/session";
import { exchangeGoogleCode, saveGoogleConnection } from "@/server/integrations/google-sheets";
import { db } from "@/server/db";
import { getConfig, getAppUrl, getRegistrationMode } from "@/server/config";
import { logger } from "@/server/logger";

export async function GET(req: NextRequest) {
  const appUrl = await getAppUrl();
  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");
  const stateRaw = req.nextUrl.searchParams.get("state");

  let mode = "connect";
  let returnTo = "/app/leads/google_maps";

  if (stateRaw) {
    try {
      const parsed = JSON.parse(Buffer.from(stateRaw, "base64").toString("utf8"));
      if (parsed.mode) mode = parsed.mode;
      if (parsed.returnTo) returnTo = parsed.returnTo;
    } catch {
      // Ignore state parse error
    }
  }

  if (error || !code) {
    logger.warn({ error }, "Google OAuth callback error or user cancelled");
    const dest = mode === "login" ? "/login" : returnTo;
    return NextResponse.redirect(new URL(`${dest}?error=google_auth_failed`, appUrl));
  }

  try {
    const tokens = await exchangeGoogleCode(code);

    // MODE 1: USER AUTHENTICATION (Sign In / Sign Up with Google)
    if (mode === "login") {
      const email = tokens.email?.toLowerCase();
      if (!email) {
        return NextResponse.redirect(new URL("/login?error=no_email_provided", appUrl));
      }

      let user = await db.users.findUnique({ where: { email } });

      if (user) {
        if (!user.email_verified_at) {
          await db.users.update({ where: { id: user.id }, data: { email_verified_at: new Date() } });
        }
        await db.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
      } else {
        // New user registration
        const userCount = await db.users.count();
        const adminEmail = (await getConfig("ADMIN_EMAIL"))?.toLowerCase();
        const isAdmin = userCount === 0 || (!!adminEmail && adminEmail === email);

        const regMode = await getRegistrationMode();
        if (!isAdmin && regMode === "closed") {
          return NextResponse.redirect(new URL("/signup?error=registration_closed", appUrl));
        }

        if (!isAdmin && regMode === "invite") {
          return NextResponse.redirect(new URL("/login?error=invite_only", appUrl));
        }

        const defaultPlan = (await getConfig("DEFAULT_PLAN")) || "free";

        user = await db.users.create({
          data: {
            email,
            name: tokens.name || email.split("@")[0],
            email_verified_at: new Date(),
            role: isAdmin ? "super_admin" : "user",
            status: "active",
            plan: defaultPlan,
            workspaces: { create: { name: "Default", is_default: true } },
            user_settings: { create: {} },
            oauth_accounts: {
              create: {
                provider: "google",
                provider_account_id: email,
              },
            },
          },
        });
      }

      // Save Google tokens for this user for Sheets and Outreach integrations
      try {
        await saveGoogleConnection(user.id, tokens);
      } catch (connErr) {
        logger.warn({ connErr }, "Could not auto-link google connection tokens");
      }

      // Establish session cookie
      await createSession(user.id);

      const targetPath = user.onboarded_at ? returnTo : "/onboarding";
      return NextResponse.redirect(new URL(targetPath, appUrl));
    }

    // MODE 2: CONNECTING GOOGLE SHEETS FOR EXISTING USER SESSION
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.redirect(new URL("/login?error=unauthorized", appUrl));
    }

    await saveGoogleConnection(session.user.id, tokens);
    return NextResponse.redirect(new URL(`${returnTo}?google_connected=true`, appUrl));
  } catch (err: any) {
    logger.error({ err }, "Failed to complete Google OAuth exchange");
    const failDest = mode === "login" ? "/login" : returnTo;
    return NextResponse.redirect(
      new URL(`${failDest}?error=${encodeURIComponent(err.message || "exchange_failed")}`, appUrl)
    );
  }
}
