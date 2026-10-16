import { db, scoped } from "@/server/db";
import { decrypt } from "@/server/crypto";
import type { ApiKeyProviderType } from "./types";

/**
 * Retrieves and decrypts the user's active API key for a specified provider.
 * The plaintext key is NEVER logged or exposed to the client.
 */
export async function getUserApiKey(
  userId: string,
  provider: ApiKeyProviderType
): Promise<string | null> {
  const record = await db.api_keys.findFirst({
    where: scoped(userId, { provider, status: "active" }),
    orderBy: { created_at: "desc" },
  });

  if (!record || !record.key_enc) {
    return null;
  }

  try {
    return decrypt(record.key_enc);
  } catch {
    return null;
  }
}

/**
 * Specifically returns decrypted Bright Data API key for scraping jobs.
 */
export async function getUserBrightDataKey(userId: string): Promise<string | null> {
  return getUserApiKey(userId, "bright_data");
}

/**
 * Checks whether user has an active Bright Data key configured.
 */
export async function hasUserBrightDataKey(userId: string): Promise<boolean> {
  const count = await db.api_keys.count({
    where: scoped(userId, { provider: "bright_data", status: "active" }),
  });
  return count > 0;
}
