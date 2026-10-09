/**
 * Central runtime config. Precedence: ENV > system_settings (encrypted) > default.
 * Missing credentials never crash the app; features report "Not configured".
 */
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";

export type ConfigKey =
  | "APP_URL" | "ADMIN_EMAIL" | "REGISTRATION_MODE"
  | "SYSTEM_SMTP_HOST" | "SYSTEM_SMTP_PORT" | "SYSTEM_SMTP_USER" | "SYSTEM_SMTP_PASS" | "SYSTEM_SMTP_FROM"
  | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_API_KEY"
  | "META_APP_ID" | "META_APP_SECRET"
  | "LINKEDIN_CLIENT_ID" | "LINKEDIN_CLIENT_SECRET"
  | "PLACES_API_KEY" | "APIFY_TOKEN"
  | "DEFAULT_TEXT_MODEL" | "DEFAULT_IMAGE_MODEL";

const DEV_KEY_B64 = Buffer.alloc(32, "autohub-dev-master-config-key").toString("base64");
function encKey(): string | undefined {
  if (process.env.APP_ENCRYPTION_KEY) return undefined;
  return DEV_KEY_B64;
}

export async function getConfig(key: ConfigKey): Promise<string | undefined> {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;
  try {
    const row = await db.system_settings.findUnique({ where: { key } });
    if (row) return decrypt(row.value_enc, encKey());
  } catch {
    // DB or encryption key unavailable: treat as not configured.
  }
  return undefined;
}

export async function isConfigured(...keys: ConfigKey[]): Promise<boolean> {
  const vals = await Promise.all(keys.map((k) => getConfig(k)));
  return vals.every(Boolean);
}

export async function getAppUrl(): Promise<string> {
  return (await getConfig("APP_URL")) ?? "http://localhost:3000";
}

export async function getRegistrationMode(): Promise<"open" | "invite"> {
  return (await getConfig("REGISTRATION_MODE")) === "open" ? "open" : "invite";
}
