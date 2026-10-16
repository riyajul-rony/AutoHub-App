import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getSocialProvider } from "@/server/providers/social/registry";
import { getAppUrl } from "@/server/config";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { logger } from "@/server/logger";

interface OAuthStatePayload {
  userId: string;
  provider: string;
  timestamp: number;
}

function createOAuthState(userId: string, provider: string): string {
  const payload: OAuthStatePayload = {
    userId,
    provider,
    timestamp: Date.now(),
  };
  return Buffer.from(encrypt(JSON.stringify(payload))).toString("base64url");
}

function verifyOAuthState(stateStr: string): OAuthStatePayload | null {
  try {
    const rawEncrypted = Buffer.from(stateStr, "base64url").toString("utf8");
    const decryptedJson = decrypt(rawEncrypted);
    const parsed: OAuthStatePayload = JSON.parse(decryptedJson);
    // Allow up to 15 minutes for OAuth completion
    if (Date.now() - parsed.timestamp > 15 * 60 * 1000) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  const providerId = providerParam.toLowerCase();

  if (!["facebook", "instagram", "linkedin"].includes(providerId)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl.replace(/\/$/, "")}/api/v1/social/oauth/${providerId}`;

  // 1. Authorization initiation
  if (action === "authorize") {
    const session = await getSessionUser();
    if (!session) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("redirect", `/app/social`);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const provider = getSocialProvider(providerId);
      const oauthState = createOAuthState(session.user.id, providerId);
      const authUrl = provider.getAuthUrl(oauthState, redirectUri);
      return NextResponse.redirect(authUrl);
    } catch (err: any) {
      logger.error({ err, providerId }, "Failed to generate social OAuth authorization URL");
      const errUrl = new URL("/app/social", req.url);
      errUrl.searchParams.set("error", err.message || "Failed to initialize social login");
      return NextResponse.redirect(errUrl);
    }
  }

  // 2. Error handling from provider
  if (error || errorDescription) {
    logger.warn({ error, errorDescription, providerId }, "Social OAuth error returned from provider");
    const errUrl = new URL("/app/social", req.url);
    errUrl.searchParams.set("error", errorDescription || error || "Authorization cancelled");
    return NextResponse.redirect(errUrl);
  }

  // 3. OAuth callback code exchange
  if (code && state) {
    const statePayload = verifyOAuthState(state);
    if (!statePayload || statePayload.provider !== providerId) {
      const errUrl = new URL("/app/social", req.url);
      errUrl.searchParams.set("error", "Invalid or expired authorization state");
      return NextResponse.redirect(errUrl);
    }

    try {
      const provider = getSocialProvider(providerId);
      const accounts = await provider.handleCallback(code, redirectUri);

      if (!accounts || accounts.length === 0) {
        throw new Error("No accessible accounts or pages found for this profile");
      }

      for (const acc of accounts) {
        const encryptedToken = encrypt(acc.accessToken);
        const encryptedRefresh = acc.refreshToken ? encrypt(acc.refreshToken) : null;
        const expiresAt = acc.expiresInSeconds
          ? new Date(Date.now() + acc.expiresInSeconds * 1000)
          : null;

        await db.social_accounts.upsert({
          where: {
            user_id_provider_external_id: {
              user_id: statePayload.userId,
              provider: providerId as any,
              external_id: acc.externalId,
            },
          },
          create: {
            user_id: statePayload.userId,
            provider: providerId as any,
            external_id: acc.externalId,
            display_name: acc.displayName,
            picture_url: acc.pictureUrl || null,
            access_token_enc: encryptedToken,
            refresh_token_enc: encryptedRefresh,
            token_expires_at: expiresAt,
            scopes: acc.scopes || ["publish_posts"],
            status: "active",
          },
          update: {
            display_name: acc.displayName,
            picture_url: acc.pictureUrl || null,
            access_token_enc: encryptedToken,
            refresh_token_enc: encryptedRefresh,
            token_expires_at: expiresAt,
            scopes: acc.scopes || ["publish_posts"],
            status: "active",
            last_error: null,
            updated_at: new Date(),
          },
        });
      }

      const successUrl = new URL("/app/social", req.url);
      successUrl.searchParams.set("connected", providerId);
      successUrl.searchParams.set("count", String(accounts.length));
      return NextResponse.redirect(successUrl);
    } catch (err: any) {
      logger.error({ err, providerId }, "Failed to process social OAuth callback");
      const errUrl = new URL("/app/social", req.url);
      errUrl.searchParams.set("error", err.message || "Failed to connect social account");
      return NextResponse.redirect(errUrl);
    }
  }

  return NextResponse.json({ error: "Missing required OAuth parameters" }, { status: 400 });
}
