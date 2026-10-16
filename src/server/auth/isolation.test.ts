import { describe, it, expect, beforeEach } from "vitest";
import { db, scoped } from "@/server/db";
import { encrypt } from "@/server/crypto";

describe("Multi-Tenant Data Isolation (User A vs User B)", () => {
  const USER_A_ID = "11111111-1111-1111-1111-111111111111";
  const USER_B_ID = "22222222-2222-2222-2222-222222222222";

  const USER_B_KEY_ID = "key-user-b-001";
  const USER_B_SEARCH_ID = "search-user-b-001";
  const USER_B_LEAD_ID = "lead-user-b-001";
  const USER_B_SOCIAL_CAMPAIGN_ID = "camp-user-b-001";
  const USER_B_OUTREACH_CAMPAIGN_ID = "outreach-user-b-001";

  beforeEach(async () => {
    // 1. Seed User B's API Key
    await db.api_keys.create({
      data: {
        id: USER_B_KEY_ID,
        user_id: USER_B_ID,
        provider: "openai",
        label: "User B Secret Key",
        key_enc: encrypt("sk-user-b-secret-api-key"),
        key_last4: "9999",
        status: "active",
      },
    });

    // 2. Seed User B's Lead Search & Lead
    await db.lead_searches.create({
      data: {
        id: USER_B_SEARCH_ID,
        user_id: USER_B_ID,
        source: "google_maps",
        params: { keyword: "Dentists", location: "Miami" },
        status: "completed",
        found_count: 1,
      },
    });

    await db.leads.create({
      data: {
        id: USER_B_LEAD_ID,
        user_id: USER_B_ID,
        search_id: USER_B_SEARCH_ID,
        dedupe_key: "lead_b_1",
        company_name: "User B Exclusive Dental",
        email: "private@userb-client.com",
        phone: "+13055550199",
        source: "google_maps",
        status: "new",
      },
    });

    // 3. Seed User B's Social Campaign
    await db.social_campaigns.create({
      data: {
        id: USER_B_SOCIAL_CAMPAIGN_ID,
        user_id: USER_B_ID,
        social_account_id: "soc-acc-b-1",
        name: "User B High Value Campaign",
        status: "active",
        business_name: "User B Brand",
        timezone: "UTC",
      },
    });

    // 4. Seed User B's Outreach Campaign
    await db.outreach_campaigns.create({
      data: {
        id: USER_B_OUTREACH_CAMPAIGN_ID,
        user_id: USER_B_ID,
        name: "User B Private Outreach",
        mode: "custom",
        timezone: "UTC",
        status: "draft",
      },
    });
  });

  describe("API Keys Isolation", () => {
    it("User A cannot list User B's API keys", async () => {
      const userAKeys = await db.api_keys.findMany({
        where: scoped(USER_A_ID),
      });

      const foundUserBKey = userAKeys.find((k: any) => k.id === USER_B_KEY_ID);
      expect(foundUserBKey).toBeUndefined();
    });

    it("User A cannot read User B's API key by ID using scoped lookup", async () => {
      const key = await db.api_keys.findFirst({
        where: scoped(USER_A_ID, { id: USER_B_KEY_ID }),
      });
      expect(key).toBeNull();
    });
  });

  describe("Leads & Lead Searches Isolation", () => {
    it("User A cannot list User B's lead searches", async () => {
      const userASearches = await db.lead_searches.findMany({
        where: { user_id: USER_A_ID },
      });

      const found = userASearches.find((s: any) => s.id === USER_B_SEARCH_ID);
      expect(found).toBeUndefined();
    });

    it("User A cannot read User B's leads", async () => {
      const userALeads = await db.leads.findMany({
        where: { user_id: USER_A_ID },
      });

      const found = userALeads.find((l: any) => l.id === USER_B_LEAD_ID);
      expect(found).toBeUndefined();
    });

    it("User A cannot fetch User B's lead by ID", async () => {
      const lead = await db.leads.findFirst({
        where: { user_id: USER_A_ID, id: USER_B_LEAD_ID },
      });
      expect(lead).toBeNull();
    });
  });

  describe("Campaigns & Outreach Isolation", () => {
    it("User A cannot list User B's social campaigns", async () => {
      const userACampaigns = await db.social_campaigns.findMany({
        where: scoped(USER_A_ID),
      });

      const found = userACampaigns.find((c: any) => c.id === USER_B_SOCIAL_CAMPAIGN_ID);
      expect(found).toBeUndefined();
    });

    it("User A cannot access User B's social campaign by ID", async () => {
      const camp = await db.social_campaigns.findFirst({
        where: scoped(USER_A_ID, { id: USER_B_SOCIAL_CAMPAIGN_ID }),
      });
      expect(camp).toBeNull();
    });

    it("User A cannot list User B's outreach campaigns", async () => {
      const userAOutreach = await db.outreach_campaigns.findMany({
        where: { user_id: USER_A_ID },
      });

      const found = userAOutreach.find((c: any) => c.id === USER_B_OUTREACH_CAMPAIGN_ID);
      expect(found).toBeUndefined();
    });

    it("User A cannot access User B's outreach campaign by ID", async () => {
      const camp = await db.outreach_campaigns.findFirst({
        where: { user_id: USER_A_ID, id: USER_B_OUTREACH_CAMPAIGN_ID },
      });
      expect(camp).toBeNull();
    });
  });

  describe("Strict scoped() Helper Verification", () => {
    it("scoped() always injects user_id into where conditions", () => {
      const query = scoped(USER_A_ID, { status: "active", label: "My Key" });
      expect(query).toEqual({
        status: "active",
        label: "My Key",
        user_id: USER_A_ID,
      });
    });

    it("scoped() prevents overriding user_id from an external payload", () => {
      // Even if attacker attempts to pass user_id in payload, scoped() must enforce the authenticated session user
      const maliciousPayload = { user_id: USER_B_ID, id: "target-id" };
      const safeQuery = scoped(USER_A_ID, maliciousPayload);
      expect(safeQuery.user_id).toBe(USER_A_ID);
    });
  });
});
