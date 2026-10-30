import { describe, it, expect, vi, beforeEach } from "vitest";
import { encrypt, decrypt, last4 } from "@/server/crypto";
import { getUserApiKey } from "./service";
import { db } from "@/server/db";

describe("API Keys Management & AES-256-GCM Storage", () => {
  const TEST_USER_ID = "33333333-3333-3333-3333-333333333333";
  const RAW_OPENAI_KEY = "sk-proj-testkeyabcdef1234567890";

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("AES-256-GCM Encryption and Masking", () => {
    it("encrypts and decrypts secret keys with versioned GCM payload", () => {
      const encrypted = encrypt(RAW_OPENAI_KEY);
      expect(encrypted).toMatch(/^v1:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
      expect(encrypted).not.toContain(RAW_OPENAI_KEY);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(RAW_OPENAI_KEY);
    });

    it("masks key to only the last 4 characters", () => {
      expect(last4(RAW_OPENAI_KEY)).toBe("7890");
    });
  });

  describe("API Keys Service", () => {
    it("saves and retrieves decrypted OpenAI key for user", async () => {
      const saved = await db.api_keys.create({
        data: {
          user_id: TEST_USER_ID,
          provider: "openai",
          label: "My OpenAI Key",
          key_enc: encrypt(RAW_OPENAI_KEY),
          key_last4: last4(RAW_OPENAI_KEY),
          status: "active",
          metadata: {},
        },
      });

      expect(saved.id).toBeDefined();

      const retrieved = await getUserApiKey(TEST_USER_ID, "openai");
      expect(retrieved).toBe(RAW_OPENAI_KEY);
    });

    it("returns null for non-existent or inactive keys", async () => {
      const otherUser = "99999999-9999-9999-9999-999999999999";
      const retrieved = await getUserApiKey(otherUser, "openai");
      expect(retrieved).toBeNull();
    });
  });
});
