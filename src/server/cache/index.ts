import IORedis from "ioredis";
import { logger } from "@/server/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let cacheClient: IORedis | null = null;
let isRedisAvailable = true;
let lastLogTime = 0;

function getCacheClient(): IORedis | null {
  if (!cacheClient) {
    try {
      cacheClient = new IORedis(redisUrl, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });

      cacheClient.on("connect", () => {
        isRedisAvailable = true;
      });

      cacheClient.on("error", (err) => {
        isRedisAvailable = false;
        const now = Date.now();
        // Throttle warning log to once every 60s
        if (now - lastLogTime > 60000) {
          lastLogTime = now;
          logger.warn({ err: err.message }, "[Cache] Redis unavailable, falling back to direct database execution.");
        }
      });
    } catch {
      isRedisAvailable = false;
      return null;
    }
  }
  return cacheClient;
}

/**
 * Get a parsed JSON value from Redis. Fails gracefully to null if Redis is offline.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getCacheClient();
  if (!client || !isRedisAvailable) return null;

  try {
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

/**
 * Set a JSON serializable value in Redis with a TTL in seconds. Fails gracefully.
 */
export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  const client = getCacheClient();
  if (!client || !isRedisAvailable || ttlSeconds <= 0) return;

  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch {
    // Fail-open: ignore cache write failure
  }
}

/**
 * Delete one or more keys from Redis. Fails gracefully.
 */
export async function cacheDel(...keys: string[]): Promise<void> {
  const client = getCacheClient();
  if (!client || !isRedisAvailable || keys.length === 0) return;

  try {
    const validKeys = keys.filter(Boolean);
    if (validKeys.length > 0) {
      await client.del(...validKeys);
    }
  } catch {
    // Fail-open: ignore cache delete failure
  }
}

/**
 * Find all keys matching a pattern. Uses SCAN for safety. Fails gracefully.
 */
export async function cacheFindKeys(pattern: string): Promise<string[]> {
  const client = getCacheClient();
  if (!client || !isRedisAvailable) return [];

  const found: string[] = [];
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        found.push(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Fail-open
  }
  return found;
}

/**
 * Delete keys matching a pattern (e.g. "session:*"). Uses SCAN for safety. Fails gracefully.
 */
export async function cacheDelPattern(pattern: string): Promise<void> {
  const client = getCacheClient();
  if (!client || !isRedisAvailable) return;

  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // Fail-open
  }
}

/**
 * Helper to get from cache or compute and store in cache.
 */
export async function cacheRemember<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}
