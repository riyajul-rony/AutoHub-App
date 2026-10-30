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

