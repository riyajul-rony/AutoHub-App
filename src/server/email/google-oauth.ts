import { getConfig, getAppUrl } from "@/server/config";
import { encrypt, decrypt } from "@/server/crypto";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_ENDPOINT = "https://www.googleapis.com/oauth2/v2/userinfo";
const GMAIL_SEND_ENDPOINT = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

export interface GoogleOutreachTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  email: string;
  name?: string;
}

export async function getGoogleOutreachClientCredentials() {
  const clientId = (await getConfig("GOOGLE_CLIENT_ID")) || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = (await getConfig("GOOGLE_CLIENT_SECRET")) || process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/v1/auth/google/outreach/callback`;

  return {
    clientId: clientId?.trim() || "",
    clientSecret: clientSecret?.trim() || "",
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

/**
 * Builds the Google OAuth consent URL for connecting a cold outreach sender account.
 * Uses minimal restricted scope: https://www.googleapis.com/auth/gmail.send
 */
export async function getGoogleOutreachAuthUrl(
  userId: string,
  statePayload: { returnTo?: string; includeReadScope?: boolean } = {}
): Promise<{ url?: string; error?: string }> {
  const creds = await getGoogleOutreachClientCredentials();
  if (!creds.configured) {
    return {
      error:
        "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment or settings.",
    };
  }

  // Minimal scopes: identity + send only (no inbox reading by default)
  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.send",
  ];

  if (statePayload.includeReadScope) {
    scopes.push("https://www.googleapis.com/auth/gmail.readonly");
  }

  const stateString = Buffer.from(
    JSON.stringify({
      userId,
      returnTo: statePayload.returnTo || "/app/outreach/email-accounts",
      includeReadScope: Boolean(statePayload.includeReadScope),
      ts: Date.now(),
    })
  ).toString("base64");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: stateString,
  });

  return { url: `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}` };
}

/**
 * Exchanges the authorization code received from Google for access & refresh tokens.
 */
export async function exchangeGoogleOutreachCode(code: string): Promise<GoogleOutreachTokens> {
  const creds = await getGoogleOutreachClientCredentials();
  if (!creds.configured) {
    throw new Error("Google OAuth credentials missing");
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    logger.error({ data }, "Google token exchange failed");
    throw new Error(data.error_description || data.error || "Failed to exchange Google OAuth code");
  }

  // Fetch verified user email
  const userinfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const userinfo = await userinfoRes.json();

  if (!userinfo.email) {
    throw new Error("Unable to retrieve verified email address from Google Account");
  }

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in || 3600,
    scope: data.scope || "",
    token_type: data.token_type || "Bearer",
    email: userinfo.email.toLowerCase().trim(),
    name: userinfo.name || undefined,
  };
}

/**
 * Refreshes an expired Google access token using the encrypted refresh token.
 */
export async function refreshGoogleOutreachToken(
  refreshTokenEnc: string
): Promise<{ accessToken: string; expiresIn: number }> {
  const creds = await getGoogleOutreachClientCredentials();
  if (!creds.configured) {
    throw new Error("Google OAuth credentials not configured");
  }

  let rawRefreshToken = "";
  try {
    rawRefreshToken = decrypt(refreshTokenEnc);
  } catch (err: any) {
    throw new Error("Could not decrypt Google refresh token: " + err.message);
  }

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: rawRefreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    logger.warn({ data }, "Google token refresh failed");
    throw new Error(data.error_description || data.error || "Invalid Google token grant");
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 3600,
  };
}

/**
 * Returns a valid, fresh Google access token for an email account.
 * If expired, automatically refreshes and stores the new access token in the database.
 * If token revocation is detected, flags account as `needs_attention`.
 */
export async function ensureFreshGoogleAccessToken(accountId: string): Promise<string> {
  const account = await db.email_accounts.findUnique({
    where: { id: accountId },
  });

  if (!account) {
    throw new Error("Email account not found");
  }

  if (account.provider !== "gmail_api") {
    throw new Error("Account does not use Google OAuth provider");
  }

  const now = Date.now();
  const expiresAtMs = account.oauth_expires_at ? new Date(account.oauth_expires_at).getTime() : 0;

  // If access token is still valid with > 90 seconds buffer, return it directly
  if (account.oauth_access_token_enc && expiresAtMs - now > 90 * 1000) {
    try {
      return decrypt(account.oauth_access_token_enc);
    } catch {
      // Proceed to refresh if decryption fails
    }
  }

  // Refresh required
  if (!account.oauth_refresh_token_enc) {
    await db.email_accounts.update({
      where: { id: accountId },
      data: {
        status: "needs_attention",
        last_error: "Google refresh token is missing. Reconnection required.",
      },
    });
    throw new Error("Google account requires reconnection (missing refresh token)");
  }

  try {
    const { accessToken, expiresIn } = await refreshGoogleOutreachToken(account.oauth_refresh_token_enc);
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.email_accounts.update({
      where: { id: accountId },
      data: {
        oauth_access_token_enc: encrypt(accessToken),
        oauth_expires_at: newExpiresAt,
        status: account.status === "needs_attention" ? "active" : account.status,
        last_error: null,
      },
    });

    return accessToken;
  } catch (refreshErr: any) {
    logger.error({ accountId, err: refreshErr.message }, "Google OAuth token refresh failure");
    await db.email_accounts.update({
      where: { id: accountId },
      data: {
        status: "needs_attention",
        last_error: `Google authorization expired (${refreshErr.message}). Reconnection required.`,
      },
    });
    throw new Error(`Google account reconnection required: ${refreshErr.message}`);
  }
}

/**
 * Dispatches an email message directly using the official Gmail REST API.
 */
export async function sendViaGmailApi(
  accessToken: string,
  emailData: {
    from: string;
    to: string;
    replyTo?: string;
    subject: string;
    text: string;
    inReplyTo?: string;
    references?: string;
    headers?: Record<string, string>;
  }
): Promise<{ messageId: string }> {
  // Construct standard RFC 2822 email message
  const lines: string[] = [
    `From: ${emailData.from}`,
    `To: ${emailData.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(emailData.subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
  ];

  if (emailData.replyTo) {
    lines.push(`Reply-To: ${emailData.replyTo}`);
  }

  if (emailData.inReplyTo) {
    lines.push(`In-Reply-To: ${emailData.inReplyTo}`);
  }

  if (emailData.references) {
    lines.push(`References: ${emailData.references}`);
  }

  if (emailData.headers) {
    for (const [key, value] of Object.entries(emailData.headers)) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push("", Buffer.from(emailData.text, "utf8").toString("base64"));
  const rawRfc2822 = lines.join("\r\n");

  // Gmail API requires base64url encoding (replace + with -, / with _, remove trailing =)
  const rawBase64Url = Buffer.from(rawRfc2822)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch(GMAIL_SEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawBase64Url }),
  });

  const resData = await res.json();
  if (!res.ok || resData.error) {
    logger.error({ resData }, "Gmail API send rejected");
    throw new Error(resData.error?.message || "Failed to send email via Gmail API");
  }

  return { messageId: resData.id || `gmail_${Date.now()}` };
}
