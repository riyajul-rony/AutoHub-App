import { describe, it, expect, vi, beforeEach } from "vitest";
import { encrypt, decrypt, last4 } from "@/server/crypto";
import { testBrightDataKey } from "./bright-data-tester";
import { getUserApiKey, hasUserBrightDataKey } from "./service";
import { db, scoped } from "@/server/db";

describe("Phase 2: API Keys Management & AES-256-GCM Storage", () => {
  const TEST_USER_ID = "33333333-3333-3333-3333-333333333333";
  const RAW_BRIGHT_DATA_KEY = "brd-customer-abcdef1234567890";
  const RAW_OPENAI_KEY = "sk-proj-testkeyabcdef1234567890";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AES-256-GCM Encryption and Masking", () => {
    it("encrypts and decrypts secret keys with versioned GCM payload", () => {
      const encrypted = encrypt(RAW_BRIGHT_DATA_KEY);
      expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(encrypted).not.toContain(RAW_BRIGHT_DATA_KEY);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(RAW_BRIGHT_DATA_KEY);
    });

    it("masks key to only the last 4 characters", () => {
      expect(last4(RAW_BRIGHT_DATA_KEY)).toBe("7890");
      expect(last4(RAW_OPENAI_KEY)).toBe("7890");
    });
  });

  describe("Bright Data Connection Tester", () => {
    it("returns ok: true when Bright Data customer balance returns 200", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ balance: 45.5, credit: 10 }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await testBrightDataKey("test-valid-brightdata-key");
      expect(result.ok).toBe(true);
      expect(result.balance).toBe(45.5);
      expect(result.credit).toBe(10);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.brightdata.com/customer/balance",
        expect.objectContaining({
          headers: { Authorization: "Bearer test-valid-brightdata-key" },
        })
      );
    });

    it("returns ok: false with helpful message when Bright Data returns 401 Unauthorized", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await testBrightDataKey("invalid-key");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Invalid Bright Data API key");
    });

    it("handles network failure gracefully without crashing", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));
      vi.stubGlobal("fetch", mockFetch);

      const result = await testBrightDataKey("any-key");
      expect(result.ok).toBe(false);
      expect(result.error).toContain("Could not reach Bright Data servers");
    });
  });

  describe("API Keys Service", () => {
    it("saves and retrieves decrypted Bright Data key for user", async () => {
      const saved = await db.api_keys.create({
        data: {
          user_id: TEST_USER_ID,
          provider: "bright_data",
          label: "My Bright Data",
          key_enc: encrypt(RAW_BRIGHT_DATA_KEY),
          key_last4: last4(RAW_BRIGHT_DATA_KEY),
          status: "active",
        },
      });

      expect(saved.id).toBeDefined();

      const retrieved = await getUserApiKey(TEST_USER_ID, "bright_data");
      expect(retrieved).toBe(RAW_BRIGHT_DATA_KEY);

      const hasKey = await hasUserBrightDataKey(TEST_USER_ID);
      expect(hasKey).toBe(true);
    });

    it("returns null for non-existent or inactive keys", async () => {
      const otherUser = "99999999-9999-9999-9999-999999999999";
      const retrieved = await getUserApiKey(otherUser, "bright_data");
      expect(retrieved).toBeNull();

      const hasKey = await hasUserBrightDataKey(otherUser);
      expect(hasKey).toBe(false);
    });
  });
});
