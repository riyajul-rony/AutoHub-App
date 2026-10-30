import { ApifyClient } from "apify-client";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { getRedisConnection } from "@/server/queues";
import { getApifyToken } from "./config";
import { logger } from "@/server/logger";
import type { ApifyKeyRecord, ApifyKeyStatus } from "./types";

export interface AcquiredApifyKey {
  keyId: string;
  token: string;
  client: ApifyClient;
  isLegacy: boolean;
  label?: string;
}

// In-memory fallback if Redis is unavailable
const memoryInflight = new Map<string, number>();

async function getInflightCount(keyId: string): Promise<number> {
  try {
    const redis = getRedisConnection();
    if (redis.status === "ready" || redis.status === "connecting") {
      const val = await redis.get(`apify:key:${keyId}:inflight`);
      return val ? parseInt(val, 10) : 0;
    }
  } catch {
    // Redis offline, fallback to memory
  }
  return memoryInflight.get(keyId) || 0;
}

async function incrementInflight(keyId: string): Promise<number> {
  try {
    const redis = getRedisConnection();
    if (redis.status === "ready" || redis.status === "connecting") {
      const next = await redis.incr(`apify:key:${keyId}:inflight`);
      await redis.expire(`apify:key:${keyId}:inflight`, 3600); // 1 hour safety TTL
      return next;
    }
  } catch {
    // Redis offline, fallback to memory
  }
  const curr = (memoryInflight.get(keyId) || 0) + 1;
  memoryInflight.set(keyId, curr);
  return curr;
}

async function decrementInflight(keyId: string): Promise<number> {
  try {
    const redis = getRedisConnection();
    if (redis.status === "ready" || redis.status === "connecting") {
      const val = await redis.decr(`apify:key:${keyId}:inflight`);
      if (val < 0) {
        await redis.set(`apify:key:${keyId}:inflight`, 0);
        return 0;
      }
      return val;
    }
  } catch {
    // Redis offline, fallback to memory
  }
  const curr = Math.max(0, (memoryInflight.get(keyId) || 0) - 1);
  memoryInflight.set(keyId, curr);
  return curr;
}

/**
 * Acquires the least-busy active Apify key from the pool.
 * If no keys are registered in the pool, smoothly falls back to the legacy master token.
 */
export async function acquireApifyKey(
  purpose = "lead_search",
  excludedKeyIds: string[] = []
): Promise<AcquiredApifyKey> {
  const now = new Date();

  // Find all active keys not currently in cooldown
  let keys: any[] = [];
  try {
    keys = await db.apify_keys.findMany({
      where: {
        status: "active",
      },
    });
  } catch (err: any) {
    logger.warn({ err: err?.message }, "[Apify Pool] Could not query apify_keys table");
  }

  // Filter out cooled down or explicitly excluded keys
  const eligibleKeys = keys.filter((k) => {
    if (excludedKeyIds.includes(k.id)) return false;
    if (k.status !== "active") return false;
    if (k.cooldown_until && new Date(k.cooldown_until) > now) return false;
    return true;
  });

  if (eligibleKeys.length > 0) {
    // Check in-flight load for each eligible key
    const scoredKeys: Array<{ key: any; inflight: number }> = [];

    for (const key of eligibleKeys) {
      const inflight = await getInflightCount(key.id);
      const maxJobs = key.max_concurrent_jobs || 2;
      if (inflight < maxJobs) {
        scoredKeys.push({ key, inflight });
      }
    }

    // Sort by: lowest in-flight count first, then oldest last_used_at (round-robin distribution)
    scoredKeys.sort((a, b) => {
      if (a.inflight !== b.inflight) return a.inflight - b.inflight;
      const timeA = a.key.last_used_at ? new Date(a.key.last_used_at).getTime() : 0;
      const timeB = b.key.last_used_at ? new Date(b.key.last_used_at).getTime() : 0;
      return timeA - timeB;
    });

    if (scoredKeys.length > 0) {
      const chosen = scoredKeys[0].key;
      await incrementInflight(chosen.id);

      // Decrypt token
      let token: string;
      try {
        token = decrypt(chosen.token_enc).trim();
      } catch (err: any) {
        await decrementInflight(chosen.id);
        logger.error({ keyId: chosen.id, err: err?.message }, "[Apify Pool] Failed to decrypt key token");
        // Mark key disabled and try another
        await db.apify_keys.update({
          where: { id: chosen.id },
          data: { status: "disabled", last_error_reason: "Decryption failed: master key mismatch" },
        }).catch(() => {});
        return acquireApifyKey(purpose, [...excludedKeyIds, chosen.id]);
      }

      // Update last_used_at and total_runs
      await db.apify_keys.update({
        where: { id: chosen.id },
        data: {
          last_used_at: new Date(),
          total_runs: { increment: 1 },
        },
      }).catch(() => {});

      logger.info(
        { keyId: chosen.id, label: chosen.label, purpose },
        `[Apify Pool] Acquired key "${chosen.label}" (inflight: ${scoredKeys[0].inflight + 1})`
      );

      return {
        keyId: chosen.id,
        token,
        client: new ApifyClient({ token }),
        isLegacy: false,
        label: chosen.label,
      };
    }

    // All active keys are currently at max capacity
    logger.warn({ purpose }, "[Apify Pool] All pool keys are at max capacity, attempting least busy");
    const leastBusy = eligibleKeys.sort((a, b) => {
      const timeA = a.last_used_at ? new Date(a.last_used_at).getTime() : 0;
      const timeB = b.last_used_at ? new Date(b.last_used_at).getTime() : 0;
      return timeA - timeB;
    })[0];

    if (leastBusy) {
      await incrementInflight(leastBusy.id);
      const token = decrypt(leastBusy.token_enc).trim();
      return {
        keyId: leastBusy.id,
        token,
        client: new ApifyClient({ token }),
        isLegacy: false,
        label: leastBusy.label,
      };
    }
  }

  // Fallback to legacy single master token (configured in system_settings or env)
  const legacyToken = await getApifyToken();
  if (legacyToken) {
    logger.info({ purpose }, "[Apify Pool] Using legacy master Apify token fallback");
    return {
      keyId: "legacy-master-key",
      token: legacyToken,
      client: new ApifyClient({ token: legacyToken }),
      isLegacy: true,
      label: "Legacy Master Token",
    };
  }

  throw new Error("No active Apify API tokens available. Please add tokens in Admin Setup or check key status.");
}

/**
 * Releases an acquired key and handles error diagnosis (401, 402, 403 rental, 429 rate limit).
 */
export async function releaseApifyKey(
  keyId: string,
  error?: any,
  costUsd?: number
): Promise<void> {
  if (keyId === "legacy-master-key") {
    return;
  }

  await decrementInflight(keyId);

  // If cost was incurred, record it
  if (costUsd && costUsd > 0) {
    await db.apify_keys.update({
      where: { id: keyId },
      data: {
        total_cost_usd: { increment: costUsd },
      },
    }).catch(() => {});
  }

  if (!error) return;

  const errMsg = (error?.message || String(error)).toLowerCase();
  const statusCode = error?.statusCode || error?.status || 0;

  let newStatus: ApifyKeyStatus | undefined;
  let cooldownMinutes = 0;
  let reason = error?.message || "Unknown error";

  if (statusCode === 401 || errMsg.includes("invalid-token") || errMsg.includes("unauthorized")) {
    newStatus = "disabled";
    reason = "Token invalid or revoked (401 Unauthorized)";
  } else if (statusCode === 402 || errMsg.includes("payment required") || errMsg.includes("out of credit") || errMsg.includes("insufficient funds")) {
    newStatus = "cooldown";
    cooldownMinutes = 60; // 1 hour cooldown
    reason = "Account out of credits (402 Payment Required)";
  } else if (statusCode === 403 || errMsg.includes("actor-is-not-rented") || errMsg.includes("forbidden") || errMsg.includes("rental") || errMsg.includes("rent")) {
    newStatus = "cooldown";
    cooldownMinutes = 60; // 1 hour cooldown for rental issue
    reason = error?.message?.includes("rent")
      ? error.message
      : "The actor igolaizola/facebook-ad-library-scraper is not rented on this account";
  } else if (statusCode === 429 || errMsg.includes("rate limit") || errMsg.includes("too many requests") || errMsg.includes("memory limit")) {
    newStatus = "cooldown";
    cooldownMinutes = 10; // 10 min cooldown
    reason = "Rate limit or memory capacity reached (429)";
  }

  if (newStatus) {
    const updateData: any = {
      status: newStatus,
      last_error_reason: reason,
    };
    if (cooldownMinutes > 0) {
      updateData.cooldown_until = new Date(Date.now() + cooldownMinutes * 60 * 1000);
    }

    logger.warn(
      { keyId, newStatus, reason, cooldownMinutes },
      `[Apify Pool] Key error detected. Setting key to ${newStatus}`
    );

    await db.apify_keys.update({
      where: { id: keyId },
      data: updateData,
    }).catch((err: any) => {
      logger.error({ keyId, err: err?.message }, "[Apify Pool] Failed to update key status after error");
    });
  }
}

/**
 * Determines whether an error is eligible for key pool failover (i.e. another key might succeed).
 */
export function isPoolFailoverError(err: any): boolean {
  if (!err) return false;
  if (err.isRentalError) return true;
  const status = err.statusCode || err.status;
  const msg = (err.message || "").toLowerCase();
  return (
    status === 401 ||
    status === 402 ||
    status === 403 ||
    status === 429 ||
    msg.includes("actor-is-not-rented") ||
    msg.includes("not rented on this account") ||
    msg.includes("rented") ||
    msg.includes("rental") ||
    msg.includes("rate limit") ||
    msg.includes("memory limit") ||
    msg.includes("unauthorized") ||
    msg.includes("payment required")
  );
}

/**
 * High-level wrapper that executes an Apify operation with pool routing and automatic failover.
 * If key A experiences 401/402/403/429, key A is placed in cooldown and key B is automatically tried.
 */
export async function withApifyKeyPool<T>(
  purpose: string,
  fn: (acquired: AcquiredApifyKey) => Promise<T>,
  maxRetries = 2
): Promise<T> {
  const triedKeyIds: string[] = [];
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let key: AcquiredApifyKey | null = null;
    try {
      key = await acquireApifyKey(purpose, triedKeyIds);
      triedKeyIds.push(key.keyId);

      const result = await fn(key);
      await releaseApifyKey(key.keyId);
      return result;
    } catch (err: any) {
      lastError = err;
      if (key) {
        await releaseApifyKey(key.keyId, err);
      }

      if (!isPoolFailoverError(err) || attempt >= maxRetries) {
        throw err;
      }

      logger.warn(
        { attempt: attempt + 1, failedKeyId: key?.keyId, error: err?.message },
        "[Apify Pool] Operation failed with pool-eligible error. Attempting failover to another key..."
      );
    }
  }

  throw lastError;
}
