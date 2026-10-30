import { describe, it, expect } from "vitest";
import {
  buildMetaAdsLibraryUrl,
  extractDomainFromUrl,
  groupAdsByAdvertiser,
} from "./meta-ads.adapter";

describe("Meta Ads Library Adapter", () => {
  it("builds valid Meta Ad Library search URLs", () => {
    const url = buildMetaAdsLibraryUrl("cosmetic dentist", "US", true);
    expect(url).toContain("https://www.facebook.com/ads/library/?");
    expect(url).toContain("active_status=active");
    expect(url).toContain("country=US");
    expect(url).toContain("q=cosmetic+dentist");

    const allUrl = buildMetaAdsLibraryUrl("realtor", "CA", false);
    expect(allUrl).toContain("active_status=all");
    expect(allUrl).toContain("country=CA");
  });

  it("extracts clean domains from CTA landing URLs and ignores social/tracking domains", () => {
    expect(extractDomainFromUrl("https://www.drsmithdental.com/special-offer?utm_source=fb")).toBe(
      "drsmithdental.com"
    );
    expect(extractDomainFromUrl("http://myboutique.shop/products")).toBe("myboutique.shop");
    // Ignores internal social domains
    expect(extractDomainFromUrl("https://www.facebook.com/drsmithpage")).toBeUndefined();
    expect(extractDomainFromUrl("https://instagram.com/p/12345")).toBeUndefined();
    expect(extractDomainFromUrl("https://bit.ly/offer")).toBeUndefined();
    expect(extractDomainFromUrl("https://wa.me/15551234567")).toBeUndefined();
    expect(extractDomainFromUrl("https://m.me/mypage")).toBeUndefined();
  });

  it("groups ads by advertiser with igolaizola snapshot schema", () => {
    const rawAds = [
      {
        ad_archive_id: "99001",
        snapshot: {
          page_id: "3001",
          page_name: "Smile Direct Dental",
          link_url: "https://smiledirect.com/offers",
          cta_text: "Learn More",
          body: { text: "Premium dental implants in Miami" },
          page_profile_uri: "https://www.facebook.com/smiledirect",
        },
        publisher_platform: ["facebook", "instagram"],
        start_date: "2026-03-01",
      },
      {
        ad_archive_id: "99002",
        snapshot: {
          page_id: "3001",
          page_name: "Smile Direct Dental",
          link_url: "https://wa.me/13055551234", // WhatsApp URL should not become corporate website
          cta_text: "Send WhatsApp Message",
          body: { text: "Contact us directly via WhatsApp" },
        },
        publisher_platform: ["facebook"],
        start_date: "2026-03-05",
      },
    ];

    const grouped = groupAdsByAdvertiser(rawAds, "dental", "US", true);
    expect(grouped.length).toBe(1);
    expect(grouped[0].pageName).toBe("Smile Direct Dental");
    expect(grouped[0].adCount).toBe(2);
    expect(grouped[0].landingDomain).toBe("smiledirect.com");
    expect(grouped[0].landingUrl).toBe("https://smiledirect.com/offers");
  });

  it("groups ads by advertiser pageId and computes counts and sample texts", () => {
    const rawAds = [
      {
        pageId: "1001",
        pageName: "Austin Dental Care",
        adCreativeBody: "Get 20% off dental implants this spring!",
        linkUrl: "https://austindentalcare.com/promo",
        publisherPlatforms: ["facebook", "instagram"],
        startDate: "2026-03-01",
      },
      {
        pageId: "1001",
        pageName: "Austin Dental Care",
        adCreativeBody: "Second ad creative for the same clinic",
        linkUrl: "https://austindentalcare.com/promo2",
        publisherPlatforms: ["facebook", "messenger"],
        startDate: "2026-03-05",
      },
      {
        pageId: "2002",
        pageName: "Downtown Fitness Gym",
        adCreativeBody: "Join now with zero enrollment fee!",
        linkUrl: "https://downtownfitness.com",
        publisherPlatforms: ["instagram"],
        startDate: "2026-03-10",
      },
    ];

    const grouped = groupAdsByAdvertiser(rawAds, "dental", "US", true);

    expect(grouped.length).toBe(2);

    const dentalAdv = grouped.find((a) => a.pageId === "1001");
    expect(dentalAdv).toBeDefined();
    expect(dentalAdv?.pageName).toBe("Austin Dental Care");
    expect(dentalAdv?.adCount).toBe(2);
    expect(dentalAdv?.sampleAdText).toBe("Get 20% off dental implants this spring!");
    expect(dentalAdv?.landingDomain).toBe("austindentalcare.com");
    expect(dentalAdv?.platforms).toContain("facebook");
    expect(dentalAdv?.platforms).toContain("instagram");
    expect(dentalAdv?.platforms).toContain("messenger");

    const gymAdv = grouped.find((a) => a.pageId === "2002");
    expect(gymAdv).toBeDefined();
    expect(gymAdv?.adCount).toBe(1);
    expect(gymAdv?.landingDomain).toBe("downtownfitness.com");
  });
});
