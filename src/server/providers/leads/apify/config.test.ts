import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  saveApifyToken,
  deleteApifyToken,
  getApifyConfigStatus,
  getMaskedApifyToken,
  getApifyToken,
  isApifyConfigured,
  SYSTEM_SETTING_KEY_TOKEN,
} from "./config";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { GET as getStatusRoute } from "@/app/api/v1/apify/status/route";
import { GET as getAdminApifyRoute, POST as postAdminApifyRoute } from "@/app/api/v1/admin/apify/route";
import * as sessionModule from "@/server/auth/session";

describe("Apify Configuration & Diagnostics Regression Tests", () => {
  const ORIGINAL_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY;
  const ORIGINAL_APIFY_TOKEN = process.env.APIFY_TOKEN;
  const TEST_VALID_TOKEN = "apify_api_RealSecretToken_9876";

  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY =
      ORIGINAL_ENCRYPTION_KEY || "YgQy3M3zuanQBqBR4D3mf2b/OFfDrcAa99WlPpa/wZU=";
    delete process.env.APIFY_TOKEN;
    await deleteApifyToken();
  });

  afterEach(async () => {
    process.env.APP_ENCRYPTION_KEY = ORIGINAL_ENCRYPTION_KEY;
    if (ORIGINAL_APIFY_TOKEN) {
      process.env.APIFY_TOKEN = ORIGINAL_APIFY_TOKEN;
    } else {
      delete process.env.APIFY_TOKEN;
    }
    vi.restoreAllMocks();
  });

  it("1. Token saved then read back as configured with reason OK", async () => {
    const masked = await saveApifyToken(TEST_VALID_TOKEN);
    expect(masked).toBe("••••9876");

    const status = await getApifyConfigStatus();
    expect(status.configured).toBe(true);
    expect(status.reason).toBe("OK");

    const isConfigured = await isApifyConfigured();
    expect(isConfigured).toBe(true);

    const retrievedMasked = await getMaskedApifyToken();
    expect(retrievedMasked).toBe("••••9876");
  });

  it("2. Missing encryption key returns ENCRYPTION_KEY_MISSING and configured: false", async () => {
    await saveApifyToken(TEST_VALID_TOKEN);

    // Simulate missing APP_ENCRYPTION_KEY
    process.env.APP_ENCRYPTION_KEY = "";

    const status = await getApifyConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.reason).toBe("ENCRYPTION_KEY_MISSING");

    const isConfigured = await isApifyConfigured();
    expect(isConfigured).toBe(false);
  });

  it("3. Corrupted ciphertext returns DECRYPT_FAILED and configured: false", async () => {
    // Write corrupted ciphertext into system_settings
    await db.system_settings.upsert({
      where: { key: SYSTEM_SETTING_KEY_TOKEN },
      create: {
        key: SYSTEM_SETTING_KEY_TOKEN,
        value_enc: "v1:badiv123:badcipher456:badtag789",
      },
      update: {
        value_enc: "v1:badiv123:badcipher456:badtag789",
      },
    });

    const status = await getApifyConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.reason).toBe("DECRYPT_FAILED");

    const isConfigured = await isApifyConfigured();
    expect(isConfigured).toBe(false);
  });

  it("4. Token missing returns NO_TOKEN and configured: false", async () => {
    await deleteApifyToken();
    delete process.env.APIFY_TOKEN;

    const status = await getApifyConfigStatus();
    expect(status.configured).toBe(false);
    expect(status.reason).toBe("NO_TOKEN");

    const isConfigured = await isApifyConfigured();
    expect(isConfigured).toBe(false);

    const masked = await getMaskedApifyToken();
    expect(masked).toBeNull();
  });

  it("5. Non-admin cannot read or write the token via admin routes", async () => {
    // Mock standard non-admin user session
    vi.spyOn(sessionModule, "getSessionUser").mockResolvedValue({
      user: {
        id: "user-123",
        email: "user@example.com",
        name: "Regular User",
        role: "user",
        status: "active",
      },
      sessionId: "sess-123",
    } as any);

    // GET /api/v1/admin/apify
    const getRes = await getAdminApifyRoute();
    expect(getRes.status).toBe(403);
    const getData = await getRes.json();
    expect(getData.error).toContain("Forbidden");

    // POST /api/v1/admin/apify
    const postReq = {
      json: async () => ({ token: "apify_api_hackerToken" }),
    } as any;
    const postRes = await postAdminApifyRoute(postReq);
    expect(postRes.status).toBe(403);
  });

  it("6. Status endpoint never contains the raw token and provides safe response structure", async () => {
    await saveApifyToken(TEST_VALID_TOKEN);

    // Non-admin session
    vi.spyOn(sessionModule, "getSessionUser").mockResolvedValue({
      user: {
        id: "user-regular",
        email: "regular@example.com",
        name: "Regular User",
        role: "user",
        status: "active",
      },
      sessionId: "sess-user",
    } as any);

    const res = await getStatusRoute();
    expect(res.status).toBe(200);

    const rawJson = await res.text();
    // NEVER contains the plaintext secret token
    expect(rawJson).not.toContain(TEST_VALID_TOKEN);
    expect(rawJson).not.toContain("RealSecretToken");

    const parsed = JSON.parse(rawJson);
    // Dual resilience: both data.configured and configured exist
    expect(parsed.configured).toBe(true);
    expect(parsed.data.configured).toBe(true);
    // Regular users do NOT see diagnostic reason code
    expect(parsed.reason).toBeUndefined();
    expect(parsed.data.reason).toBeUndefined();

    // Now test with Admin session
    vi.spyOn(sessionModule, "getSessionUser").mockResolvedValue({
      user: {
        id: "admin-super",
        email: "admin@example.com",
        name: "Super Admin",
        role: "super_admin",
        status: "active",
      },
      sessionId: "sess-admin",
    } as any);

    const adminRes = await getStatusRoute();
    expect(adminRes.status).toBe(200);

    const adminJson = await adminRes.text();
    expect(adminJson).not.toContain(TEST_VALID_TOKEN);

    const adminParsed = JSON.parse(adminJson);
    expect(adminParsed.configured).toBe(true);
    // Admins see the safe diagnostic reason code
    expect(adminParsed.reason).toBe("OK");
    expect(adminParsed.data.reason).toBe("OK");
  });
});
