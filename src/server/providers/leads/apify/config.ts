import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import type { ApifySettings, ApifyModule, PartialApifySettings } from "./types";

export const DEFAULT_APIFY_SETTINGS: ApifySettings = {
  google_maps_provider: "kaix",
  actors: {
    google_maps: "kaix/google-maps-places-scraper",
    meta_ads: "igolaizola/facebook-ad-library-scraper",
    b2b_leads: "disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads",
  },
  limits: {
    maxLinesPerRun: 5,
    maxLeadsPerRun: {
      google_maps: 100,
      meta_ads: 200,
      b2b_leads: 100,
    },
    maxSpendUsd: 5.0,
    maxConcurrentPerUser: 1,
    maxRunsPerHour: 10,
    enablePaidContacts: false,
  },
  unitPrices: {
    google_maps: 0.00008,
    meta_ads: 0.0008,
    b2b_leads: 0.0005,
  },
};

import { logger } from "@/server/logger";

export const SYSTEM_SETTING_KEY_TOKEN = "apify_token";
export const SYSTEM_SETTING_KEY_CONFIG = "apify_config";
export const SYSTEM_SETTING_KEY_LAST_TEST = "apify_last_test";

export type ApifyConfigReason =
  | "OK"
  | "NO_TOKEN"
  | "DECRYPT_FAILED"
  | "ENCRYPTION_KEY_MISSING"
  | "TOKEN_INVALID"
  | "APIFY_UNREACHABLE";

export interface ApifyLastTestResult {
  ok: boolean;
  username?: string;
  plan?: string;
  testedAt: string;
  reason?: ApifyConfigReason;
  error?: string;
}

export interface ApifyConfigStatus {
  configured: boolean;
  reason: ApifyConfigReason;
  lastTest?: ApifyLastTestResult | null;
}

/**
 * Validates master encryption key existence for storing/decrypting Apify token
 */
function assertEncryptionKey(): void {
  if (!process.env.APP_ENCRYPTION_KEY || process.env.APP_ENCRYPTION_KEY.trim() === "") {
    throw new Error(
      "APP_ENCRYPTION_KEY environment variable is missing. Please set a 32-byte base64 encryption key."
    );
  }
}

/**
 * Saves the latest connection test result into system_settings
 */
export async function saveApifyLastTest(result: ApifyLastTestResult): Promise<void> {
  try {
    assertEncryptionKey();
    const encrypted = encrypt(JSON.stringify(result));
    await db.system_settings.upsert({
      where: { key: SYSTEM_SETTING_KEY_LAST_TEST },
      create: {
        key: SYSTEM_SETTING_KEY_LAST_TEST,
        value_enc: encrypted,
      },
      update: {
        value_enc: encrypted,
        updated_at: new Date(),
      },
    });
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[Apify Config] Failed to persist last test result");
  }
}

/**
 * Retrieves the latest cached connection test result
 */
export async function getApifyLastTest(): Promise<ApifyLastTestResult | null> {
  try {
    const record = await db.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEY_LAST_TEST },
    });
    if (record?.value_enc) {
      assertEncryptionKey();
      const raw = decrypt(record.value_enc);
      return JSON.parse(raw) as ApifyLastTestResult;
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[Apify Config] Failed to read last test result");
  }
  return null;
}

/**
 * Evaluates the diagnostic configuration status of Apify without calling external APIs.
 * Checks whether a decryptable, valid-length token exists.
 */
export async function getApifyConfigStatus(): Promise<ApifyConfigStatus> {
  const lastTest = await getApifyLastTest();

  try {
    const setting = await db.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEY_TOKEN },
    });

    if (setting?.value_enc) {
      if (!process.env.APP_ENCRYPTION_KEY || process.env.APP_ENCRYPTION_KEY.trim().length === 0) {
        logger.warn("[Apify Config] APP_ENCRYPTION_KEY is missing while encrypted token is present");
        return {
          configured: false,
          reason: "ENCRYPTION_KEY_MISSING",
          lastTest,
        };
      }

      let plaintext: string;
      try {
        plaintext = decrypt(setting.value_enc).trim();
      } catch (err: any) {
        logger.error({ err: err?.message }, "[Apify Config] Failed to decrypt saved token");
        return {
          configured: false,
          reason: "DECRYPT_FAILED",
          lastTest,
        };
      }

      if (plaintext.length < 5) {
        logger.warn("[Apify Config] Decrypted Apify token is too short");
        return {
          configured: false,
          reason: "TOKEN_INVALID",
          lastTest,
        };
      }

      return {
        configured: true,
        reason: "OK",
        lastTest,
      };
    }
  } catch (err: any) {
    logger.error({ err: err?.message }, "[Apify Config] Error checking system_settings for token");
  }

  // Fallback to environment variable if DB setting is not present
  const envToken = process.env.APIFY_TOKEN;
  if (envToken && envToken.trim().length > 0) {
    if (envToken.trim().length < 5) {
      return {
        configured: false,
        reason: "TOKEN_INVALID",
        lastTest,
      };
    }
    return {
      configured: true,
      reason: "OK",
      lastTest,
    };
  }

  return {
    configured: false,
    reason: "NO_TOKEN",
    lastTest,
  };
}

/**
 * Retrieves the plaintext Apify token.
 * Token resolution order:
 * 1. Encrypted token in system_settings table (AES-256-GCM)
 * 2. Fallback to APIFY_TOKEN environment variable
 */
export async function getApifyToken(): Promise<string | null> {
  try {
    const setting = await db.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEY_TOKEN },
    });

    if (setting?.value_enc) {
      assertEncryptionKey();
      return decrypt(setting.value_enc).trim();
    }
  } catch (err: any) {
    if (err.message?.includes("APP_ENCRYPTION_KEY")) {
      throw err;
    }
    // If decryption failed, try env fallback
  }

  const envToken = process.env.APIFY_TOKEN;
  if (envToken && envToken.trim().length > 0) {
    return envToken.trim();
  }

  return null;
}

/**
 * Checks whether an Apify token is configured in the system (exists AND can be decrypted).
 * Fast local check — does not call Apify API on every load.
 */
export async function isApifyConfigured(): Promise<boolean> {
  const status = await getApifyConfigStatus();
  return status.configured;
}

/**
 * Returns a masked representation of the configured Apify token (e.g. ••••3d2a)
 * Never exposes the plaintext token.
 */
export async function getMaskedApifyToken(): Promise<string | null> {
  const token = await getApifyToken().catch(() => null);
  if (!token) return null;
  const last4 = token.slice(-4);
  return `••••${last4}`;
}

/**
 * Encrypts and saves the Apify token in system_settings
 */
export async function saveApifyToken(rawToken: string): Promise<string> {
  assertEncryptionKey();
  const clean = rawToken.trim();
  if (clean.length < 5) {
    throw new Error("Invalid Apify token format: Token is too short.");
  }

  const encrypted = encrypt(clean);

  await db.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEY_TOKEN },
    create: {
      key: SYSTEM_SETTING_KEY_TOKEN,
      value_enc: encrypted,
    },
    update: {
      value_enc: encrypted,
      updated_at: new Date(),
    },
  });

  return `••••${clean.slice(-4)}`;
}

/**
 * Deletes the Apify token from system_settings
 */
export async function deleteApifyToken(): Promise<void> {
  await db.system_settings.deleteMany({
    where: { key: SYSTEM_SETTING_KEY_TOKEN },
  });
}

/**
 * Loads current Apify configuration (actors, limits, unit prices)
 */
export async function getApifySettings(): Promise<ApifySettings> {
  try {
    const record = await db.system_settings.findUnique({
      where: { key: SYSTEM_SETTING_KEY_CONFIG },
    });

    if (record?.value_enc) {
      assertEncryptionKey();
      const decrypted = decrypt(record.value_enc);
      const parsed = JSON.parse(decrypted);

      return {
        google_maps_provider: "kaix",
        actors: {
          ...DEFAULT_APIFY_SETTINGS.actors,
          ...(parsed.actors || {}),
          google_maps: "kaix/google-maps-places-scraper",
          meta_ads: parsed.actors?.meta_ads && parsed.actors.meta_ads !== "apify/facebook-ads-scraper"
            ? parsed.actors.meta_ads
            : "igolaizola/facebook-ad-library-scraper",
        },
        limits: {
          ...DEFAULT_APIFY_SETTINGS.limits,
          ...(parsed.limits || {}),
          maxLeadsPerRun: {
            ...DEFAULT_APIFY_SETTINGS.limits.maxLeadsPerRun,
            ...(parsed.limits?.maxLeadsPerRun || {}),
          },
        },
        unitPrices: {
          ...DEFAULT_APIFY_SETTINGS.unitPrices,
          ...(parsed.unitPrices || {}),
          google_maps: parsed.unitPrices?.google_maps ?? DEFAULT_APIFY_SETTINGS.unitPrices.google_maps,
          meta_ads: parsed.unitPrices?.meta_ads ?? DEFAULT_APIFY_SETTINGS.unitPrices.meta_ads,
          b2b_leads: parsed.unitPrices?.b2b_leads ?? DEFAULT_APIFY_SETTINGS.unitPrices.b2b_leads,
        },
      };
    }
  } catch {
    // Default fallback on decryption failure or missing record
  }

  return DEFAULT_APIFY_SETTINGS;
}

/**
 * Saves Apify configuration (actors, limits, unit prices)
 */
export async function saveApifySettings(settings: PartialApifySettings): Promise<ApifySettings> {
  assertEncryptionKey();
  const current = await getApifySettings();

  const updated: ApifySettings = {
    google_maps_provider: "kaix",
    actors: { ...current.actors, ...(settings.actors || {}) },
    limits: {
      ...current.limits,
      ...(settings.limits || {}),
      maxLeadsPerRun: {
        ...current.limits.maxLeadsPerRun,
        ...(settings.limits?.maxLeadsPerRun || {}),
      },
    },
    unitPrices: {
      ...current.unitPrices,
      ...(settings.unitPrices || {}),
      google_maps: settings.unitPrices?.google_maps ?? current.unitPrices.google_maps,
      meta_ads: settings.unitPrices?.meta_ads ?? current.unitPrices.meta_ads,
      b2b_leads: settings.unitPrices?.b2b_leads ?? current.unitPrices.b2b_leads,
    },
  };

  const payloadEnc = encrypt(JSON.stringify(updated));

  await db.system_settings.upsert({
    where: { key: SYSTEM_SETTING_KEY_CONFIG },
    create: {
      key: SYSTEM_SETTING_KEY_CONFIG,
      value_enc: payloadEnc,
    },
    update: {
      value_enc: payloadEnc,
      updated_at: new Date(),
    },
  });

  return updated;
}
