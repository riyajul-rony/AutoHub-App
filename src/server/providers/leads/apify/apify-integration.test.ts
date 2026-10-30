import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGoogleMapsApify } from "./google-maps.adapter";
import * as clientModule from "./client";
import * as configModule from "./config";

describe("Apify Integration (Mocked Actor Runs)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fails gracefully when Apify token is missing", async () => {
    vi.spyOn(configModule, "getApifyToken").mockResolvedValue(null);

    await expect(clientModule.getApifyClient()).rejects.toThrow(
      "Service not configured"
    );
  });

  it("executes Google Maps search, maps dataset items, and deduplicates by place ID", async () => {
    vi.spyOn(configModule, "getApifyToken").mockResolvedValue("apify_api_test_token_9999");
    vi.spyOn(configModule, "getApifySettings").mockResolvedValue({
      actors: {
        google_maps: "kaix/google-maps-places-scraper",
        meta_ads: "igolaizola/facebook-ad-library-scraper",
        b2b_leads: "disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads",
      },
      limits: {
        maxLinesPerRun: 5,
        maxLeadsPerRun: { google_maps: 100, meta_ads: 200, b2b_leads: 100 },
        maxSpendUsd: 5.0,
        maxConcurrentPerUser: 1,
        maxRunsPerHour: 10,
        enablePaidContacts: false,
      },
      unitPrices: { google_maps: 0.005, meta_ads: 0.006, b2b_leads: 0.002 },
    });

    vi.spyOn(clientModule, "startActorRun").mockResolvedValue({
      id: "run-12345",
      actId: "compass/crawler-google-places",
      status: "RUNNING",
      defaultDatasetId: "dataset-12345",
    } as any);

    vi.spyOn(clientModule, "getActorRun").mockResolvedValue({
      id: "run-12345",
      status: "SUCCEEDED",
      defaultDatasetId: "dataset-12345",
      chargeUsd: 0.015,
    } as any);

    vi.spyOn(clientModule, "fetchDatasetItems").mockResolvedValue([
      {
        placeId: "ChIJ_11111",
        title: "Lone Star Dental",
        address: "100 Congress Ave, Austin, TX",
        phone: "+1 512-555-0101",
        website: "https://lonestardental.com",
        totalScore: 4.9,
        reviewsCount: 150,
      },
      {
        placeId: "ChIJ_22222",
        title: "Austin City Dental",
        address: "200 Barton Springs Rd, Austin, TX",
        phone: "+1 512-555-0202",
        website: "https://austincitydental.com",
        totalScore: 4.8,
        reviewsCount: 88,
      },
    ]);

    vi.spyOn(clientModule, "logApifyUsage").mockResolvedValue(undefined as any);

    const result = await searchGoogleMapsApify({
      lines: [{ niche: "dentist", location: "Austin, Texas, USA" }],
      maxLeadsPerLine: 25,
      userId: "00000000-0000-0000-0000-000000000001",
    });

    expect(result.allLeads.length).toBe(2);
    expect(result.allLeads[0].companyName).toBe("Lone Star Dental");
    expect(result.allLeads[0].website).toBe("https://lonestardental.com");
    expect(result.allLeads[0].sourceRef).toBe("ChIJ_11111");
    expect(result.allLeads[1].companyName).toBe("Austin City Dental");
  });
});
