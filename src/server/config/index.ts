/**
 * Central runtime config. Precedence: ENV > system_settings (encrypted) > default.
 * Missing credentials never crash the app; features report "Not configured".
 * All system_settings lookups are cached in Redis with instant invalidation upon updates.
 */
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "@/server/cache";

export type ConfigKey =
  | "APP_URL" | "ADMIN_EMAIL" | "REGISTRATION_MODE"
  | "MAINTENANCE_MODE" | "MAINTENANCE_MESSAGE"
  | "DEFAULT_PLAN" | "TRIAL_DAYS" | "SITE_NAME" | "SUPPORT_EMAIL"
  | "SYSTEM_SMTP_HOST" | "SYSTEM_SMTP_PORT" | "SYSTEM_SMTP_USER" | "SYSTEM_SMTP_PASS" | "SYSTEM_SMTP_FROM"
  | "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET" | "GOOGLE_API_KEY"
  | "META_APP_ID" | "META_APP_SECRET"
  | "LINKEDIN_CLIENT_ID" | "LINKEDIN_CLIENT_SECRET"
  | "PLACES_API_KEY" | "APIFY_TOKEN" | "OPENAI_API_KEY"
  | "DEFAULT_TEXT_MODEL" | "DEFAULT_IMAGE_MODEL"
  | "DEFAULT_PAYMENT_PROVIDER" | "ONLINE_PAYMENT_PUBLIC_KEY" | "ONLINE_PAYMENT_SECRET_KEY"
  | "ONLINE_PAYMENT_WEBHOOK_SECRET" | "MANUAL_PAYMENT_INSTRUCTIONS";

const DEV_KEY_B64 = Buffer.alloc(32, "leadreach-dev-master-config-key").toString("base64");
function encKey(): string | undefined {
  if (process.env.APP_ENCRYPTION_KEY) return undefined;
  return process.env.NODE_ENV !== "production" ? DEV_KEY_B64 : undefined;
}

// Memory Cache: fast L1 in-process cache (60s TTL)
const inMemoryConfigCache = new Map<string, { value: string | undefined; expiresAt: number }>();
const CONFIG_MEMORY_TTL_MS = 60_000;

export function clearConfigMemoryCache(key?: string) {
  if (key) {
    inMemoryConfigCache.delete(key);
  } else {
    inMemoryConfigCache.clear();
  }
}

/**
 * Invalidate Redis cache and in-memory cache when system_settings are changed.
 */
export async function invalidateSettingCache(key?: string): Promise<void> {
  clearConfigMemoryCache(key);
  if (key) {
    await cacheDel(`setting:${key}`, `setting:${key.toLowerCase()}`, `setting:${key.toUpperCase()}`);
  } else {
    await cacheDelPattern("setting:*");
  }
  await cacheDel("config:registration_mode", "config:maintenance_mode");
}

/**
 * Retrieve configuration value with L1 Memory + L2 Redis caching.
 */
export async function getConfig(key: ConfigKey): Promise<string | undefined> {
  const fromEnv = process.env[key];
  if (fromEnv) return fromEnv;

  const now = Date.now();
  const memCached = inMemoryConfigCache.get(key);
  if (memCached && now < memCached.expiresAt) {
    return memCached.value;
  }

  // L2 Redis Cache check
  const redisCached = await cacheGet<string>(`setting:${key}`);
  if (redisCached !== null && redisCached !== undefined) {
    inMemoryConfigCache.set(key, { value: redisCached, expiresAt: now + CONFIG_MEMORY_TTL_MS });
    return redisCached;
  }

  try {
    const row =
      (await db.system_settings.findUnique({ where: { key } })) ||
      (await db.system_settings.findUnique({ where: { key: key.toLowerCase() } }));
    const val = row ? decrypt(row.value_enc, encKey()) : undefined;

    inMemoryConfigCache.set(key, { value: val, expiresAt: now + CONFIG_MEMORY_TTL_MS });
    if (val !== undefined) {
      await cacheSet(`setting:${key}`, val, 300);
    }
    return val;
  } catch {
    // DB or encryption key unavailable: treat as not configured.
  }
  return undefined;
}

export async function getConfigs(keys: ConfigKey[]): Promise<Record<string, string | undefined>> {
  const result: Record<string, string | undefined> = {};
  const missingKeys: ConfigKey[] = [];
  const now = Date.now();

  for (const k of keys) {
    const fromEnv = process.env[k];
    if (fromEnv) {
      result[k] = fromEnv;
      continue;
    }

    const memCached = inMemoryConfigCache.get(k);
    if (memCached && now < memCached.expiresAt) {
      result[k] = memCached.value;
      continue;
    }

    missingKeys.push(k);
  }

  if (missingKeys.length > 0) {
    try {
      const rows = await db.system_settings.findMany({
        where: {
          key: {
            in: [
              ...missingKeys,
              ...missingKeys.map((k) => k.toLowerCase()),
            ],
          },
        },
      });

      const rowMap = new Map<string, string>();
      for (const row of rows) {
        const val = decrypt(row.value_enc, encKey());
        rowMap.set(row.key.toUpperCase(), val);
        rowMap.set(row.key.toLowerCase(), val);
      }

      for (const k of missingKeys) {
        const val = rowMap.get(k.toUpperCase()) ?? rowMap.get(k.toLowerCase());
        result[k] = val;
        inMemoryConfigCache.set(k, { value: val, expiresAt: now + CONFIG_MEMORY_TTL_MS });
        if (val !== undefined) {
          await cacheSet(`setting:${k}`, val, 300);
        }
      }
    } catch {
      // DB or encryption key unavailable: treat as not configured.
    }
  }

  return result;
}

export async function isConfigured(...keys: ConfigKey[]): Promise<boolean> {
  const configs = await getConfigs(keys);
  return keys.every((k) => Boolean(configs[k]));
}

export async function getAppUrl(): Promise<string> {
  return (await getConfig("APP_URL")) ?? "http://localhost:3000";
}

export type RegistrationMode = "open" | "invite" | "closed";

/**
 * Registration mode: Open / Invite-only / Closed (cached in Redis for 60s)
 */
export async function getRegistrationMode(): Promise<RegistrationMode> {
  const cached = await cacheGet<RegistrationMode>("config:registration_mode");
  if (cached === "open" || cached === "invite" || cached === "closed") {
    return cached;
  }

  const raw = ((await getConfig("REGISTRATION_MODE")) || "").toLowerCase().trim();
  let mode: RegistrationMode = "open";
  if (raw === "closed") mode = "closed";
  else if (raw === "invite") mode = "invite";

  await cacheSet("config:registration_mode", mode, 60);
  return mode;
}

/** Invalidate registration mode cache immediately when changed */
export async function invalidateRegistrationModeCache(): Promise<void> {
  await invalidateSettingCache("REGISTRATION_MODE");
}

export interface MaintenanceStatus {
  active: boolean;
  message: string;
}

/**
 * Maintenance mode status: active boolean and custom notification message.
 */
export async function getMaintenanceMode(): Promise<MaintenanceStatus> {
  const cached = await cacheGet<MaintenanceStatus>("config:maintenance_mode");
  if (cached && typeof cached.active === "boolean") {
    return cached;
  }

  const raw = ((await getConfig("MAINTENANCE_MODE")) || "").toLowerCase().trim();
  const active = raw === "true" || raw === "1" || raw === "on";
  const message =
    (await getConfig("MAINTENANCE_MESSAGE")) ||
    "Lead Reach AI is currently undergoing scheduled platform upgrades. We will be back online shortly.";

  const result: MaintenanceStatus = { active, message };
  await cacheSet("config:maintenance_mode", result, 60);
  return result;
}

export interface GlobalPlatformSettings {
  siteName: string;
  supportEmail: string;
  defaultPlan: string;
  trialDays: number;
  registrationMode: RegistrationMode;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

/**
 * Comprehensive global settings lookup with defaults.
 */
export async function getGlobalPlatformSettings(): Promise<GlobalPlatformSettings> {
  const [siteName, supportEmail, defaultPlan, trialDaysStr, regMode, maint] = await Promise.all([
    getConfig("SITE_NAME"),
    getConfig("SUPPORT_EMAIL"),
    getConfig("DEFAULT_PLAN"),
    getConfig("TRIAL_DAYS"),
    getRegistrationMode(),
    getMaintenanceMode(),
  ]);

  return {
    siteName: siteName || "Lead Reach AI",
    supportEmail: supportEmail || "support@leadreachai.cerkitlabs.tech",
    defaultPlan: defaultPlan || "free",
    trialDays: trialDaysStr ? parseInt(trialDaysStr, 10) || 14 : 14,
    registrationMode: regMode,
    maintenanceMode: maint.active,
    maintenanceMessage: maint.message,
  };
}
