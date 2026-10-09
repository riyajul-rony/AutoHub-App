import { cookies } from "next/headers";
import { db } from "@/server/db";
import { getConfig, getAppUrl } from "@/server/config";
import { encrypt, decrypt } from "@/server/crypto";
import { logger } from "@/server/logger";

const COOKIE_NAME = "autohub_google_conn";
const DEV_KEY_B64 = Buffer.alloc(32, "autohub-dev-google-sheets").toString("base64");

function encKey(): string | undefined {
  if (process.env.APP_ENCRYPTION_KEY) return undefined;
  return process.env.NODE_ENV !== "production" ? DEV_KEY_B64 : undefined;
}

export type GoogleConnectionInfo = {
  connected: boolean;
  email?: string;
  hasSheetsScope?: boolean;
  clientConfigured: boolean;
};

export async function getGoogleClientCredentials() {
  const clientId = (await getConfig("GOOGLE_CLIENT_ID")) || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = (await getConfig("GOOGLE_CLIENT_SECRET")) || process.env.GOOGLE_CLIENT_SECRET;
  const appUrl = await getAppUrl();
  const redirectUri = `${appUrl}/api/v1/auth/google/callback`;

  return {
    clientId: clientId?.trim() || "",
    clientSecret: clientSecret?.trim() || "",
    redirectUri,
    configured: Boolean(clientId && clientSecret),
  };
}

export async function getGoogleAuthUrl(state?: string): Promise<{ url?: string; error?: string }> {
  const creds = await getGoogleClientCredentials();
  if (!creds.configured) {
    return {
      error:
        "Google OAuth credentials (GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET) are not configured in .env or settings.",
    };
  }

  const scopes = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file",
  ].join(" ");

  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    scope: scopes,
    access_type: "offline",
    prompt: "consent",
    state: state || "leads_export",
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}

export async function exchangeGoogleCode(code: string) {
  const creds = await getGoogleClientCredentials();
  if (!creds.configured) throw new Error("Google credentials not configured");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
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

  const tokens = await tokenRes.json();
  if (!tokenRes.ok || !tokens.access_token) {
    throw new Error(tokens.error_description || tokens.error || "Failed to exchange Google OAuth code");
  }

  // Fetch user profile info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await userRes.json();

  return {
    accessToken: tokens.access_token as string,
    refreshToken: tokens.refresh_token as string | undefined,
    expiresIn: (tokens.expires_in as number) || 3600,
    scope: (tokens.scope as string) || "",
    email: (profile.email as string) || "user@gmail.com",
    name: profile.name as string | undefined,
  };
}

export async function saveGoogleConnection(
  userId: string,
  data: {
    accessToken: string;
    refreshToken?: string;
    expiresIn: number;
    scope: string;
    email: string;
  }
) {
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000);
  const scopesList = data.scope.split(" ").filter(Boolean);

  // 1. Try DB
  try {
    await db.google_connections.upsert({
      where: { user_id_google_email: { user_id: userId, google_email: data.email } },
      create: {
        user_id: userId,
        google_email: data.email,
        access_token_enc: encrypt(data.accessToken, encKey()),
        refresh_token_enc: data.refreshToken ? encrypt(data.refreshToken, encKey()) : null,
        expires_at: expiresAt,
        scopes: scopesList,
        status: "active",
      },
      update: {
        access_token_enc: encrypt(data.accessToken, encKey()),
        refresh_token_enc: data.refreshToken ? encrypt(data.refreshToken, encKey()) : undefined,
        expires_at: expiresAt,
        scopes: scopesList,
        status: "active",
      },
    });
  } catch (err) {
    logger.warn({ err }, "Could not save Google connection to DB, relying on session cookie");
  }

  // 2. Cookie fallback for local development
  try {
    const jar = await cookies();
    const payload = JSON.stringify({
      email: data.email,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt: expiresAt.toISOString(),
      scopes: scopesList,
    });
    jar.set(COOKIE_NAME, encrypt(payload, encKey()), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } catch {
    // Cookie store not writable in some contexts
  }
}

export async function getGoogleConnectionStatus(userId: string): Promise<GoogleConnectionInfo> {
  const creds = await getGoogleClientCredentials();

  // Try DB
  try {
    const row = await db.google_connections.findFirst({
      where: { user_id: userId, status: "active" },
      orderBy: { created_at: "desc" },
    });
    if (row) {
      const hasSheets = row.scopes.some((s: string) => s.includes("spreadsheets") || s.includes("drive"));
      return {
        connected: true,
        email: row.google_email,
        hasSheetsScope: hasSheets,
        clientConfigured: creds.configured,
      };
    }
  } catch {
    // DB not ready
  }

  // Try Cookie
  try {
    const jar = await cookies();
    const raw = jar.get(COOKIE_NAME)?.value;
    if (raw) {
      const decrypted = JSON.parse(decrypt(raw, encKey()));
      const hasSheets = (decrypted.scopes || []).some((s: string) => s.includes("spreadsheets") || s.includes("drive"));
      return {
        connected: true,
        email: decrypted.email,
        hasSheetsScope: hasSheets,
        clientConfigured: creds.configured,
      };
    }
  } catch {
    // Cookie invalid
  }

  return {
    connected: false,
    clientConfigured: creds.configured,
  };
}

export async function getValidGoogleAccessToken(userId: string): Promise<{ accessToken?: string; email?: string }> {
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  let expiresAt: Date | undefined;
  let email: string | undefined;

  // 1. Try DB
  try {
    const row = await db.google_connections.findFirst({
      where: { user_id: userId, status: "active" },
      orderBy: { created_at: "desc" },
    });
    if (row && row.access_token_enc) {
      accessToken = decrypt(row.access_token_enc, encKey());
      refreshToken = row.refresh_token_enc ? decrypt(row.refresh_token_enc, encKey()) : undefined;
      expiresAt = row.expires_at || undefined;
      email = row.google_email;
    }
  } catch {
    // DB error
  }

  // 2. Try Cookie if DB didn't find anything
  if (!accessToken) {
    try {
      const jar = await cookies();
      const raw = jar.get(COOKIE_NAME)?.value;
      if (raw) {
        const decrypted = JSON.parse(decrypt(raw, encKey()));
        accessToken = decrypted.accessToken;
        refreshToken = decrypted.refreshToken;
        expiresAt = decrypted.expiresAt ? new Date(decrypted.expiresAt) : undefined;
        email = decrypted.email;
      }
    } catch {
      // Cookie error
    }
  }

  if (!accessToken) return {};

  // Check if token expired and refresh if possible
  const isExpired = expiresAt && expiresAt.getTime() - Date.now() < 60_000;
  if (isExpired && refreshToken) {
    try {
      const creds = await getGoogleClientCredentials();
      const refRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const data = await refRes.json();
      if (refRes.ok && data.access_token) {
        accessToken = data.access_token;
        if (email) {
          await saveGoogleConnection(userId, {
            accessToken: data.access_token,
            refreshToken,
            expiresIn: data.expires_in || 3600,
            scope: data.scope || "",
            email,
          });
        }
      }
    } catch (err) {
      logger.warn({ err }, "Could not refresh Google OAuth access token");
    }
  }

  return { accessToken, email };
}

export async function disconnectGoogle(userId: string) {
  try {
    await db.google_connections.deleteMany({ where: { user_id: userId } });
  } catch {
    // DB error
  }

  try {
    const jar = await cookies();
    jar.delete(COOKIE_NAME);
  } catch {
    // Cookie error
  }
}

/**
 * Creates a brand new Google Spreadsheet using Google Sheets API v4
 * and populates it with headers and data rows.
 */
export async function createAndPopulateGoogleSheet({
  accessToken,
  title,
  headers,
  rows,
}: {
  accessToken: string;
  title: string;
  headers: string[];
  rows: string[][];
}): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  // 1. Create spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        {
          properties: {
            title: "Leads",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  const createData = await createRes.json();
  if (!createRes.ok || !createData.spreadsheetId) {
    throw new Error(createData.error?.message || "Failed to create Google Spreadsheet");
  }

  const spreadsheetId = createData.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate values
  const values = [headers, ...rows];
  const valueRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values,
      }),
    }
  );

  if (!valueRes.ok) {
    const err = await valueRes.json().catch(() => ({}));
    logger.warn({ err }, "Failed to write values to sheet");
  }

  // 3. Optional: apply styling to header row (bold, custom theme)
  try {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: 0,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.12, green: 0.16, blue: 0.24 }, // Dark slate
                  textFormat: {
                    foregroundColor: { red: 1.0, green: 1.0, blue: 1.0 },
                    bold: true,
                    fontSize: 10,
                  },
                },
              },
              fields: "userEnteredFormat(backgroundColor,textFormat)",
            },
          },
          {
            autoResizeDimensions: {
              dimensions: {
                sheetId: 0,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: headers.length,
              },
            },
          },
        ],
      }),
    });
  } catch {
    // Non-critical styling failure
  }

  return { spreadsheetId, spreadsheetUrl };
}
