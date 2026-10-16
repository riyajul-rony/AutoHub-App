import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { BrightDataClient } from "./client";
import { BrightDataGoogleMapsAdapter } from "./google-maps.adapter";
import { BrightDataMetaAdsAdapter } from "./meta-ads.adapter";
import { BrightDataLinkedInAdapter } from "./linkedin.adapter";
import { computeLeadDedupeKey, filterDuplicateLeads, normalizeCompanyName, normalizeIdentifier } from "../dedupe";
import type { RawLead } from "../types";

describe("Bright Data Lead Generation Suite (Phase 3)", () => {
  let mockServer: http.Server;
  let mockBaseUrl: string;

  const mockGmapsRecords = [
    {
      place_id: "place_101",
      name: "Downtown Manhattan Dental",
      website: "https://downtownmanhattandental.com",
      phone: "+1 212-555-0199",
      address: "123 Broadway, New York, NY 10006",
      city: "New York",
      country: "US",
      category: "Dentist",
      rating: 4.9,
      reviews_count: 180,
      email: "contact@downtownmanhattandental.com",
      facebook: "https://facebook.com/downtownmanhattandental",
      instagram: "https://instagram.com/downtownmanhattandental",
      linkedin: "https://linkedin.com/company/downtownmanhattandental",
    },
    {
      place_id: "place_102",
      name: "Dental Care Without Website",
      website: "",
      phone: "+1 212-555-0200",
      address: "456 5th Ave, New York, NY 10018",
      city: "New York",
      country: "US",
      category: "Dental clinic",
      rating: 4.5,
      reviews_count: 32,
    },
  ];

  const mockMetaRecords = [
    {
      ad_id: "meta_ad_999",
      page_name: "Apex Fitness Gear",
      link_url: "https://apexfitnessgear.com/shop",
      phone: "+1 415-555-9000",
      page_location: "San Francisco, CA",
      city: "San Francisco",
      country: "US",
      category: "Athletic Apparel & Equipment",
      email: "support@apexfitnessgear.com",
      page_profile_uri: "https://facebook.com/apexfitnessgear",
      instagram_url: "https://instagram.com/apexfitnessgear",
    },
  ];

  const mockLinkedInRecords = [
    {
      linkedin_id: "li_comp_777",
      company_name: "CloudScale Software Ltd",
      website: "https://cloudscalesoftware.com",
      phone: "+44 20 7946 0991",
      headquarters: "London, Greater London",
      city: "London",
      country: "GB",
      industry: "Computer Software",
      email: "info@cloudscalesoftware.com",
      url: "https://linkedin.com/company/cloudscale-software",
    },
  ];

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      const auth = req.headers.authorization;
      const url = new URL(req.url || "", `http://${req.headers.host}`);

      if (!auth || !auth.startsWith("Bearer valid_bright_data_key")) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Unauthorized Bright Data token" }));
        return;
      }

      // 1. Trigger dataset
      if (req.method === "POST" && url.pathname === "/datasets/v3/trigger") {
        const datasetId = url.searchParams.get("dataset_id");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ snapshot_id: `snap_${datasetId}` }));
        return;
      }

      // 2. Check progress
      if (req.method === "GET" && url.pathname.startsWith("/datasets/v3/progress/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ready", progress: 100 }));
        return;
      }

      // 3. Download snapshot
      if (req.method === "GET" && url.pathname.startsWith("/datasets/v3/snapshot/")) {
        res.writeHead(200, { "Content-Type": "application/json" });
        if (url.pathname.includes("gd_m8ebnr0q2qlklc02fz")) {
          res.end(JSON.stringify(mockGmapsRecords));
        } else if (url.pathname.includes("gd_l1vikf871t3fl47z5u")) {
          res.end(JSON.stringify(mockMetaRecords));
        } else if (url.pathname.includes("gd_l1vikfnt1wgvvqz95w")) {
          res.end(JSON.stringify(mockLinkedInRecords));
        } else {
          res.end(JSON.stringify([]));
        }
        return;
      }

      res.writeHead(404);
      res.end("Not Found");
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address() as any;
        mockBaseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  describe("1. BrightDataClient", () => {
    it("successfully triggers, polls, and downloads JSON snapshot data", async () => {
      const client = new BrightDataClient(mockBaseUrl);
      const snapshot = await client.executeDatasetQuery<any>({
        datasetId: "gd_m8ebnr0q2qlklc02fz",
        input: [{ query: "Dentist in New York", limit: 10 }],
        apiKey: "valid_bright_data_key",
        baseUrl: mockBaseUrl,
      });

      expect(snapshot).toHaveLength(2);
      expect(snapshot[0].name).toBe("Downtown Manhattan Dental");
    });

    it("throws helpful error when API key is unauthorized or rejected", async () => {
      const client = new BrightDataClient(mockBaseUrl);
      await expect(
        client.executeDatasetQuery<any>({
          datasetId: "gd_m8ebnr0q2qlklc02fz",
          input: [{ query: "test" }],
          apiKey: "invalid_key",
          baseUrl: mockBaseUrl,
        })
      ).rejects.toThrow(/unauthorized/i);
    });
  });

  describe("2. Google Maps Bright Data Adapter", () => {
    it("normalizes all required fields (company_name, website, phone, address, country, business_type, rating, reviews_count)", async () => {
      const adapter = new BrightDataGoogleMapsAdapter();
      const leads = await adapter.search(
        {
          keyword: "Dentist",
          location: "New York",
          maxResults: 10,
          onlyWithWebsite: false,
        },
        "valid_bright_data_key",
        mockBaseUrl
      );

      expect(leads.length).toBe(2);

      const lead = leads[0];
      expect(lead.companyName).toBe("Downtown Manhattan Dental");
      expect(lead.website).toBe("https://downtownmanhattandental.com");
      expect(lead.phoneRaw).toBe("+1 212-555-0199");
      expect(lead.phoneE164).toBe("+12125550199");
      expect(lead.address).toContain("New York");
      expect(lead.country).toBe("US");
      expect(lead.businessType).toBe("Dentist");
      expect(lead.rating).toBe(4.9);
      expect(lead.reviewsCount).toBe(180);
      expect(lead.sourceRef).toBe("place_101");
      expect(lead.facebookUrl).toBe("https://facebook.com/downtownmanhattandental");
      expect(lead.instagramUrl).toMatch(/https:\/\/instagram\.com\/downtownmanhattandental\/?/);
      expect(lead.linkedinUrl).toBe("https://linkedin.com/company/downtownmanhattandental");
    });

    it("filters out businesses without website when onlyWithWebsite is true", async () => {
      const adapter = new BrightDataGoogleMapsAdapter();
      const leads = await adapter.search(
        {
          keyword: "Dentist",
          location: "New York",
          maxResults: 10,
          onlyWithWebsite: true,
        },
        "valid_bright_data_key",
        mockBaseUrl
      );

      expect(leads.length).toBe(1);
      expect(leads[0].companyName).toBe("Downtown Manhattan Dental");
    });
  });

  describe("3. Meta Ads Bright Data Adapter", () => {
    it("normalizes active advertiser records with proper fields and channels", async () => {
      const adapter = new BrightDataMetaAdsAdapter();
      const leads = await adapter.search(
        {
          keyword: "Fitness",
          location: "US",
          maxResults: 10,
        },
        "valid_bright_data_key",
        mockBaseUrl
      );

      expect(leads.length).toBe(1);
      const lead = leads[0];
      expect(lead.companyName).toBe("Apex Fitness Gear");
      expect(lead.website).toBe("https://apexfitnessgear.com/shop");
      expect(lead.businessType).toBe("Athletic Apparel & Equipment");
      expect(lead.sourceRef).toBe("meta_ad_999");
      expect(lead.facebookUrl).toBe("https://facebook.com/apexfitnessgear");
      expect(lead.instagramUrl).toMatch(/https:\/\/instagram\.com\/apexfitnessgear\/?/);
      expect(lead.rating).toBeUndefined();
      expect(lead.reviewsCount).toBeUndefined();
    });
  });

  describe("4. LinkedIn Bright Data Adapter", () => {
    it("normalizes B2B company records with headquarters, industry, and profile URL", async () => {
      const adapter = new BrightDataLinkedInAdapter();
      const leads = await adapter.search(
        {
          keyword: "Software",
          location: "London",
          maxResults: 10,
        },
        "valid_bright_data_key",
        mockBaseUrl
      );

      expect(leads.length).toBe(1);
      const lead = leads[0];
      expect(lead.companyName).toBe("CloudScale Software Ltd");
      expect(lead.website).toBe("https://cloudscalesoftware.com");
      expect(lead.businessType).toBe("Computer Software");
      expect(lead.sourceRef).toBe("li_comp_777");
      expect(lead.country).toBe("GB");
      expect(lead.linkedinUrl).toBe("https://linkedin.com/company/cloudscale-software");
    });
  });

  describe("5. Deterministic Lead Deduplication", () => {
    const userA = "00000000-0000-0000-0000-000000000001";
    const userB = "00000000-0000-0000-0000-000000000002";

    it("produces identical SHA-256 hash for identical company and website", () => {
      const key1 = computeLeadDedupeKey(userA, "Apex Dental Care, LLC", { website: "https://apexdental.com/" });
      const key2 = computeLeadDedupeKey(userA, "apex dental care llc", { website: "http://www.apexdental.com" });

      expect(key1).toBe(key2);
      expect(key1).toHaveLength(64);
    });

    it("produces identical SHA-256 hash when matching phone numbers", () => {
      const key1 = computeLeadDedupeKey(userA, "Smile Clinic", { phone: "+1 (212) 555-1234" });
      const key2 = computeLeadDedupeKey(userA, "Smile Clinic", { phone: "2125551234" });

      expect(key1).toBe(key2);
    });

    it("enforces tenant isolation: different users have different dedupe hashes for same business", () => {
      const keyA = computeLeadDedupeKey(userA, "Smile Clinic", { website: "https://smile.com" });
      const keyB = computeLeadDedupeKey(userB, "Smile Clinic", { website: "https://smile.com" });

      expect(keyA).not.toBe(keyB);
    });

    it("filters out existing leads and batch duplicates correctly", () => {
      const testLeads: RawLead[] = [
        {
          companyName: "Business Alpha",
          website: "https://alpha.com",
          sourceRef: "ref-1",
        },
        {
          companyName: "Business Alpha", // In-batch duplicate
          website: "https://www.alpha.com/",
          sourceRef: "ref-1-duplicate",
        },
        {
          companyName: "Business Beta", // Already in DB
          website: "https://beta.com",
          sourceRef: "ref-2",
        },
        {
          companyName: "Business Gamma", // New
          website: "https://gamma.com",
          sourceRef: "ref-3",
        },
      ];

      const existingBetaKey = computeLeadDedupeKey(userA, "Business Beta", { website: "https://beta.com" });
      const existingKeys = new Set<string>([existingBetaKey]);

      const { uniqueLeads, duplicateCount } = filterDuplicateLeads(userA, testLeads, existingKeys);

      expect(duplicateCount).toBe(2); // 1 in-batch duplicate + 1 pre-existing
      expect(uniqueLeads).toHaveLength(2);
      expect(uniqueLeads[0].lead.companyName).toBe("Business Alpha");
      expect(uniqueLeads[1].lead.companyName).toBe("Business Gamma");
    });
  });
});
