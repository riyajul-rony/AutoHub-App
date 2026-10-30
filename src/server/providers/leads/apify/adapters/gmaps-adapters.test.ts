import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchGoogleMapsKaix } from "./kaix-gmaps.adapter";
import { searchGoogleMapsApify } from "../google-maps.adapter";
import * as clientModule from "../client";
import * as configModule from "../config";
import * as poolModule from "../pool-service";

describe("Google Maps Provider Adapter (Apify · kaix)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const baseSettings = {
    google_maps_provider: "kaix" as const,
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
    unitPrices: {
      google_maps: 0.00008,
      meta_ads: 0.0008,
      b2b_leads: 0.002,
    },
  };

  it("Kaix adapter formats input with query, location, websiteFilter, and maps fields to RawLead", async () => {
    vi.spyOn(configModule, "getApifySettings").mockResolvedValue(baseSettings);

    // Mock withApifyKeyPool to execute immediately with mock client
    vi.spyOn(poolModule, "withApifyKeyPool").mockImplementation(async (_purpose, fn) => {
      return fn({
        keyId: "test-key-1",
        token: "apify_api_mock",
        client: {} as any,
        isLegacy: false,
        label: "Primary Key",
      });
    });

    const startRunSpy = vi.spyOn(clientModule, "startActorRun").mockResolvedValue({
      id: "run-kaix-1",
      actId: "kaix/google-maps-places-scraper",
      status: "RUNNING",
      defaultDatasetId: "dataset-kaix-1",
    } as any);

    vi.spyOn(clientModule, "getActorRun").mockResolvedValue({
      id: "run-kaix-1",
      status: "SUCCEEDED",
      defaultDatasetId: "dataset-kaix-1",
      chargeUsd: 0.0008,
    } as any);

    vi.spyOn(clientModule, "fetchDatasetItems").mockResolvedValue([
      {
        placeId: "kaix-place-1",
        title: "Sunset Dental Clinic",
        formattedAddress: "789 Ocean Ave, Miami, FL 33139",
        city: "Miami",
        countryCode: "US",
        phone: "+1 305 555 0199",
        website: "https://sunsetdentalmiami.com",
        rating: 4.9,
        reviewCount: 180,
        categories: ["Dentist", "Dental Clinic"],
        googleMapsUri: "https://maps.google.com/?cid=998877",
        latitude: 25.7617,
        longitude: -80.1918,
      },
    ]);

    const logUsageSpy = vi.spyOn(clientModule, "logApifyUsage").mockResolvedValue(undefined as any);

    const res = await searchGoogleMapsKaix({
      lines: [{ niche: "dentist", location: "Miami, FL" }],
      maxLeadsPerLine: 10,
      userId: "user-1",
    });

    expect(startRunSpy).toHaveBeenCalledWith(
      "kaix/google-maps-places-scraper",
      expect.objectContaining({
        query: "dentist",
        location: "Miami, FL",
        searchType: "area",
        includeContacts: false,
        proxyConfiguration: { useApifyProxy: true },
        maxResults: 10,
      }),
      expect.any(Object)
    );

    expect(res.allLeads).toHaveLength(1);
    const lead = res.allLeads[0];
    expect(lead.companyName).toBe("Sunset Dental Clinic");
    expect(lead.sourceRef).toBe("kaix-place-1");
    expect(lead.website).toBe("https://sunsetdentalmiami.com");
    expect(lead.phoneRaw).toBe("+1 305 555 0199");
    expect(lead.businessType).toBe("Dentist");
    expect(lead.rating).toBe(4.9);
    expect(lead.reviewsCount).toBe(180);
    expect(lead.latitude).toBe(25.7617);
    expect(lead.longitude).toBe(-80.1918);
    expect(lead.extra?.provider).toBe("Apify · kaix");

    expect(logUsageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        module: "google_maps",
        actorId: "kaix/google-maps-places-scraper",
        itemCount: 1,
        estimatedCost: 1 * 0.00008,
      })
    );
  });

  it("Universal dispatcher searchGoogleMapsApify dispatches to kaix", async () => {
    vi.spyOn(configModule, "getApifySettings").mockResolvedValue(baseSettings);

    vi.spyOn(poolModule, "withApifyKeyPool").mockImplementation(async (_purpose, fn) => {
      return fn({
        keyId: "test-key-1",
        token: "mock_tok",
        client: {} as any,
        isLegacy: false,
      });
    });

    vi.spyOn(clientModule, "startActorRun").mockResolvedValue({
      id: "run-kaix-2",
      actId: "kaix/google-maps-places-scraper",
      status: "RUNNING",
      defaultDatasetId: "dataset-kaix-2",
    } as any);

    vi.spyOn(clientModule, "getActorRun").mockResolvedValue({
      id: "run-kaix-2",
      status: "SUCCEEDED",
      defaultDatasetId: "dataset-kaix-2",
    } as any);

    vi.spyOn(clientModule, "fetchDatasetItems").mockResolvedValue([
      {
        placeId: "p-2",
        title: "Artisan Bakery",
        website: "https://artisanbakery.com",
      },
    ]);

    vi.spyOn(clientModule, "logApifyUsage").mockResolvedValue(undefined as any);

    const res = await searchGoogleMapsApify({
      lines: [{ niche: "bakery", location: "Austin, TX" }],
      maxLeadsPerLine: 5,
      userId: "user-1",
    });

    expect(res.allLeads).toHaveLength(1);
    expect(res.allLeads[0].companyName).toBe("Artisan Bakery");
    expect(res.allLeads[0].extra?.provider).toBe("Apify · kaix");
  });
});
