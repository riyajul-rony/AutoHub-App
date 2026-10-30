import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  acquireApifyKey,
  releaseApifyKey,
  withApifyKeyPool,
  isPoolFailoverError,
} from "./pool-service";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import * as configModule from "./config";

describe("Apify Key Pool & Load Balancing Service", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("isPoolFailoverError accurately identifies 401, 402, 403, 429, and rental errors", () => {
    expect(isPoolFailoverError({ statusCode: 401 })).toBe(true);
    expect(isPoolFailoverError({ statusCode: 402 })).toBe(true);
    expect(isPoolFailoverError({ statusCode: 403 })).toBe(true);
    expect(isPoolFailoverError({ statusCode: 429 })).toBe(true);
    expect(isPoolFailoverError({ message: "Actor is not rented for this user" })).toBe(true);
    expect(isPoolFailoverError({ message: "Rate limit exceeded" })).toBe(true);
    expect(isPoolFailoverError({ statusCode: 500, message: "Internal server error" })).toBe(false);
  });

  it("acquireApifyKey falls back to legacy token when pool is empty", async () => {
    vi.spyOn(db.apify_keys, "findMany").mockResolvedValue([]);
    vi.spyOn(configModule, "getApifyToken").mockResolvedValue("apify_api_fallback_token_1234");

    const acquired = await acquireApifyKey("test_search");
    expect(acquired.isLegacy).toBe(true);
    expect(acquired.keyId).toBe("legacy-master-key");
    expect(acquired.token).toBe("apify_api_fallback_token_1234");
  });

  it("acquireApifyKey selects active key from database pool and decrypts token", async () => {
    process.env.APP_ENCRYPTION_KEY =
      process.env.APP_ENCRYPTION_KEY || "YgQy3M3zuanQBqBR4D3mf2b/OFfDrcAa99WlPpa/wZU=";

    const secretToken = "apify_api_secret_key_pool_test";
    const encrypted = encrypt(secretToken);

    vi.spyOn(db.apify_keys, "findMany").mockResolvedValue([
      {
        id: "key-pool-1",
        label: "Scale Key 1",
        token_enc: encrypted,
        token_last4: "test",
        status: "active",
        max_concurrent_jobs: 2,
        cooldown_until: null,
        last_used_at: null,
      },
    ]);

    const updateSpy = vi.spyOn(db.apify_keys, "update").mockResolvedValue({} as any);

    const acquired = await acquireApifyKey("test_search");
    expect(acquired.isLegacy).toBe(false);
    expect(acquired.keyId).toBe("key-pool-1");
    expect(acquired.token).toBe(secretToken);
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-pool-1" },
        data: expect.objectContaining({
          total_runs: { increment: 1 },
        }),
      })
    );

    await releaseApifyKey(acquired.keyId);
  });

  it("releaseApifyKey puts key into cooldown on 403 / rental error and disables on 401", async () => {
    const updateSpy = vi.spyOn(db.apify_keys, "update").mockResolvedValue({} as any);

    // 403 Forbidden / rental error -> cooldown
    await releaseApifyKey("key-1", { statusCode: 403, message: "actor-is-not-rented" });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-1" },
        data: expect.objectContaining({
          status: "cooldown",
        }),
      })
    );

    // 401 Unauthorized -> disabled
    await releaseApifyKey("key-2", { statusCode: 401, message: "invalid-token" });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-2" },
        data: expect.objectContaining({
          status: "disabled",
        }),
      })
    );
  });

  it("withApifyKeyPool retries with another key on rental error", async () => {
    process.env.APP_ENCRYPTION_KEY =
      process.env.APP_ENCRYPTION_KEY || "YgQy3M3zuanQBqBR4D3mf2b/OFfDrcAa99WlPpa/wZU=";

    const enc1 = encrypt("token-1");
    const enc2 = encrypt("token-2");

    const mockKeys = [
      {
        id: "key-1",
        label: "Key 1",
        token_enc: enc1,
        status: "active",
        max_concurrent_jobs: 2,
        cooldown_until: null,
        last_used_at: new Date(1000),
      },
      {
        id: "key-2",
        label: "Key 2",
        token_enc: enc2,
        status: "active",
        max_concurrent_jobs: 2,
        cooldown_until: null,
        last_used_at: new Date(2000),
      },
    ];

    vi.spyOn(db.apify_keys, "findMany").mockResolvedValue(mockKeys);
    vi.spyOn(db.apify_keys, "update").mockResolvedValue({} as any);

    let attempts = 0;
    const result = await withApifyKeyPool("test_run", async ({ keyId }) => {
      attempts++;
      if (attempts === 1) {
        const rentalErr: any = new Error("Actor is not rented for this user account");
        rentalErr.statusCode = 403;
        throw rentalErr;
      }
      return { success: true, keyUsed: keyId };
    });

    expect(attempts).toBe(2);
    expect(result.success).toBe(true);
    expect(result.keyUsed).toBe("key-2");
  });
});
