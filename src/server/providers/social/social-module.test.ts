import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { getSocialProvider } from "@/server/providers/social/registry";
import { facebookProvider } from "@/server/providers/social/facebook";
import { instagramProvider } from "@/server/providers/social/instagram";
import { linkedinProvider } from "@/server/providers/social/linkedin";
import * as AccountsRoute from "@/app/api/v1/social/accounts/route";
import * as SingleAccountRoute from "@/app/api/v1/social/accounts/[id]/route";
import * as CampaignsRoute from "@/app/api/v1/social/campaigns/route";
import * as PostsRoute from "@/app/api/v1/social/posts/route";
import * as PublishRoute from "@/app/api/v1/social/posts/[id]/publish/route";
import * as PreviewRoute from "@/app/api/v1/social/preview/route";
import * as OAuthRoute from "@/app/api/v1/social/oauth/[provider]/route";

// Mock session module to simulate multiple tenants
const mockSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getSessionUser: () => mockSession(),
}));

describe("Phase 5: Social Media Auto Post (Facebook, Instagram, LinkedIn)", () => {
  const user1 = {
    sessionId: "sess-user1",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "tenant1@leadreach.io",
      role: "user",
    },
  };

  const user2 = {
    sessionId: "sess-user2",
    user: {
      id: "22222222-2222-2222-2222-222222222222",
      email: "tenant2@leadreach.io",
      role: "user",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Multi-Tenant Social Account Management & AES-256-GCM Encryption", () => {
    it("connects Facebook page for User 1 and stores AES-256-GCM encrypted token", async () => {
      mockSession.mockResolvedValue(user1);

      const rawToken = "EAABmock_token_secret_12345";
      const req = new NextRequest("http://localhost:3000/api/v1/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "facebook",
          display_name: "Lead Reach AI Motors Dhaka",
          external_id: "page_dhaka_01",
          access_token: rawToken,
        }),
      });

      const res = await AccountsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.display_name).toBe("Lead Reach AI Motors Dhaka");
      expect(json.data.external_id).toBe("page_dhaka_01");

      // Verify token in DB is strictly encrypted (starts with v1:) and can be decrypted
      const storedAccount = await db.social_accounts.findFirst({
        where: { user_id: user1.user.id, external_id: "page_dhaka_01" },
      });
      expect(storedAccount).toBeTruthy();
      expect(storedAccount.access_token_enc).toMatch(/^v1:/);
      expect(decrypt(storedAccount.access_token_enc)).toBe(rawToken);
    });

    it("ensures User 2 cannot see or access User 1's connected accounts", async () => {
      mockSession.mockResolvedValue(user2);

      const res = await AccountsRoute.GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      const user1Accounts = json.data.filter((a: any) => a.external_id === "page_dhaka_01");
      expect(user1Accounts.length).toBe(0);
    });

    it("prevents User 2 from deleting User 1's connected account", async () => {
      const stored = await db.social_accounts.findFirst({
        where: { user_id: user1.user.id, external_id: "page_dhaka_01" },
      });
      expect(stored).toBeTruthy();

      mockSession.mockResolvedValue(user2);
      const req = new NextRequest(`http://localhost:3000/api/v1/social/accounts/${stored.id}`, {
        method: "DELETE",
      });

      await SingleAccountRoute.DELETE(req, { params: Promise.resolve({ id: stored.id }) });

      // User 1's account must still exist
      const checkStillExists = await db.social_accounts.findFirst({
        where: { user_id: user1.user.id, id: stored.id },
      });
      expect(checkStillExists).toBeTruthy();
    });
  });

  describe("2. Campaign Creation & Multi-Tenant Social Account Ownership", () => {
    it("rejects User 2 attempting to create a campaign using User 1's social account", async () => {
      const user1Account = await db.social_accounts.findFirst({
        where: { user_id: user1.user.id },
      });
      expect(user1Account).toBeTruthy();

      mockSession.mockResolvedValue(user2);
      const req = new NextRequest("http://localhost:3000/api/v1/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Stolen Account Campaign",
          social_account_id: user1Account.id,
        }),
      });

      const res = await CampaignsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toMatch(/does not belong to you/i);
    });

    it("allows User 1 to create campaign linked to their own account", async () => {
      mockSession.mockResolvedValue(user1);
      const user1Account = await db.social_accounts.findFirst({
        where: { user_id: user1.user.id },
      });

      const req = new NextRequest("http://localhost:3000/api/v1/social/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Daily Motivation & Car Tips",
          social_account_id: user1Account.id,
          business_name: "Lead Reach AI Motors",
          business_category: "Automotive",
          post_times: ["09:00", "18:00"],
          approval_mode: "approve",
        }),
      });

      const res = await CampaignsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.name).toBe("Daily Motivation & Car Tips");
      expect(json.data.user_id).toBe(user1.user.id);
    });
  });

  describe("3. AI Post Generation & Tenant-Specific OpenAI Key Resolution", () => {
    it("rejects unauthenticated users attempting to preview AI social posts", async () => {
      mockSession.mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/api/v1/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_category: "Real Estate" }),
      });

      const res = await PreviewRoute.POST(req);
      expect(res.status).toBe(401);
    });

    it("generates post preview for User 1 using fallback or personal key", async () => {
      mockSession.mockResolvedValue(user1);
      const req = new NextRequest("http://localhost:3000/api/v1/social/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: "Lead Reach AI Properties",
          business_category: "Real Estate",
          prompt: "Luxury duplex apartments in Gulshan",
        }),
      });

      const res = await PreviewRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.caption).toBeTruthy();
      expect(json.data.hashtags.length).toBeGreaterThan(0);
    });

    it("creates a post run in pending_approval status for the campaign", async () => {
      mockSession.mockResolvedValue(user1);
      const campaign = await db.social_campaigns.findFirst({
        where: { user_id: user1.user.id },
      });
      expect(campaign).toBeTruthy();

      const req = new NextRequest("http://localhost:3000/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
        }),
      });

      const res = await PostsRoute.POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.user_id).toBe(user1.user.id);
      expect(json.data.campaign_id).toBe(campaign.id);
      expect(json.data.status).toBe("pending_approval");
      expect(json.data.caption).toBeTruthy();
    });
  });

  describe("4. Post Publishing & Tenant Isolation", () => {
    it("prevents User 2 from approving and publishing User 1's post run", async () => {
      const user1Post = await db.post_runs.findFirst({
        where: { user_id: user1.user.id },
      });
      expect(user1Post).toBeTruthy();

      mockSession.mockResolvedValue(user2);
      const req = new NextRequest(`http://localhost:3000/api/v1/social/posts/${user1Post.id}/publish`, {
        method: "POST",
      });

      const res = await PublishRoute.POST(req, { params: Promise.resolve({ id: user1Post.id }) });
      expect(res.status).toBe(404);
    });

    it("allows User 1 to publish their post run and updates status to published with live URL", async () => {
      const user1Post = await db.post_runs.findFirst({
        where: { user_id: user1.user.id },
      });
      expect(user1Post).toBeTruthy();

      mockSession.mockResolvedValue(user1);
      const req = new NextRequest(`http://localhost:3000/api/v1/social/posts/${user1Post.id}/publish`, {
        method: "POST",
      });

      const res = await PublishRoute.POST(req, { params: Promise.resolve({ id: user1Post.id }) });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.status).toBe("published");
      expect(json.data.external_post_id).toBeTruthy();
      expect(json.data.external_url).toBeTruthy();
    });
  });

  describe("5. Social Provider Adapters (Facebook, Instagram, LinkedIn)", () => {
    it("resolves providers correctly via registry", () => {
      expect(getSocialProvider("facebook")).toBe(facebookProvider);
      expect(getSocialProvider("instagram")).toBe(instagramProvider);
      expect(getSocialProvider("linkedin")).toBe(linkedinProvider);
    });

    it("publishes to Instagram with simulated test token", async () => {
      const result = await instagramProvider.publish("mock_ig_token", "ig_acc_999", {
        caption: "Special showroom showcase 🚗 #LeadReachAI",
        imageUrl: "https://example.com/car.jpg",
      });

      expect(result.externalId).toMatch(/^ig_/);
      expect(result.url).toContain("instagram.com");
    });

    it("publishes to LinkedIn with simulated test token", async () => {
      const result = await linkedinProvider.publish("mock_li_token", "person_777", {
        caption: "Leading the automotive AI revolution #Leadership",
      });

      expect(result.externalId).toMatch(/^urn:li:share:/);
      expect(result.url).toContain("linkedin.com");
    });

    it("publishes to Facebook Page with simulated test token", async () => {
      const result = await facebookProvider.publish("mock_fb_token", "page_123", {
        caption: "Weekend special discount on all models!",
      });

      expect(result.externalId).toMatch(/^fb_/);
      expect(result.url).toContain("facebook.com");
    });
  });

  describe("6. Social OAuth Authorization & Callback Handling", () => {
    it("redirects unauthenticated users to login on OAuth authorize", async () => {
      mockSession.mockResolvedValue(null);
      const req = new NextRequest("http://localhost:3000/api/v1/social/oauth/facebook?action=authorize");
      const res = await OAuthRoute.GET(req, { params: Promise.resolve({ provider: "facebook" }) });

      expect(res.status).toBe(307); // redirect
      expect(res.headers.get("location")).toContain("/login");
    });

    it("redirects authenticated user to Meta OAuth URL with encrypted state", async () => {
      mockSession.mockResolvedValue(user1);
      const req = new NextRequest("http://localhost:3000/api/v1/social/oauth/facebook?action=authorize");
      const res = await OAuthRoute.GET(req, { params: Promise.resolve({ provider: "facebook" }) });

      expect(res.status).toBe(307);
      const location = res.headers.get("location");
      expect(location).toContain("facebook.com");
      expect(location).toContain("dialog/oauth");
      expect(location).toContain("state=");
    });
  });
});
