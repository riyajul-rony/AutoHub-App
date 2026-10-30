import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  STANDARD_EXPORT_HEADERS,
  generateCsvContent,
  generateTsvContent,
  generateHtmlTableContent,
  formatLeadRowForExport,
  cleanFieldValue,
} from "./export-helpers";
import { formatLeadRecord } from "./formatter";
import { computeLeadDedupeKey, filterDuplicateLeads } from "./dedupe";

describe("End-to-End Leads Module Integration (Phase 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("E2E Multi-Source Search & Normalization", () => {
    it("should process Google Maps raw places and normalize into 25-column exportable format", () => {
      const rawPlace = {
        company_name: "Premier Dental Care",
        address: "123 Main St, New York, NY",
        phone: "+1 212-555-0199",
        website: "https://premierdental.example.com",
        rating: 4.9,
        email: "appointments@premierdental.example.com",
        extra: {
          reviews_count: 215,
          source: "google_maps",
        },
      };

      const lead = formatLeadRecord(rawPlace);

      expect(lead.company_name).toBe("Premier Dental Care");
      expect(lead.company_location).toBe("123 Main St, New York, NY");
      expect(lead.company_phones).toContain("1 212-555-0199");
      expect(lead.company_website).toBe("https://premierdental.example.com");
      expect(lead.rating).toBe(4.9);
      expect(lead.extra?.reviews_count).toBe(215);

      // Verify row export
      const row = formatLeadRowForExport(lead);
      expect(row).toHaveLength(25);
      expect(row[0]).toBe("Premier Dental Care");
      expect(row[18]).toBe("google_maps");
      expect(row[19]).toBe(4.9);
      expect(row[20]).toBe(215);

      // Verify CSV generation with UTF-8 BOM
      const csv = generateCsvContent(STANDARD_EXPORT_HEADERS, [row]);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain('"Premier Dental Care"');
    });

    it("should process Meta Ads Library results with campaign intelligence and ad copy", () => {
      const rawAd = {
        company_name: "Glow Skin Lab",
        website: "https://glowskinlab.com",
        email: "hello@glowskinlab.com",
        phone: "+1 800-555-4567",
        extra: {
          ad_library_url: "https://www.facebook.com/ads/library/?id=987654321",
          ad_count: 6,
          platforms: ["facebook", "instagram"],
          ad_snippet: "Try our new organic Vitamin C serum today!",
          source: "meta_ads",
        },
      };

      const lead = formatLeadRecord(rawAd);

      expect(lead.company_name).toBe("Glow Skin Lab");
      expect(lead.ad_count).toBe(6);
      expect(lead.ad_library_url).toBe("https://www.facebook.com/ads/library/?id=987654321");
      expect(lead.platforms).toEqual(["facebook", "instagram"]);
      expect(lead.company_website).toBe("https://glowskinlab.com");

      // Verify row export
      const row = formatLeadRowForExport(lead);
      expect(row[0]).toBe("Glow Skin Lab");
      expect(row[18]).toBe("meta_ads");
      expect(row[21]).toBe(6);
      expect(row[22]).toBe("https://www.facebook.com/ads/library/?id=987654321");
    });

    it("should process LinkedIn results with company profile and verified decision makers", () => {
      const rawLinkedIn = {
        company_name: "NexGen Logistics",
        website: "https://nexgenlogistics.io",
        linkedin_url: "https://linkedin.com/company/nexgen-logistics",
        extra: {
          industry: "Freight & Supply Chain",
          company_size: "201-500 employees",
          source: "linkedin",
          decision_makers: [
            {
              name: "Marcus Sterling",
              title: "Chief Executive Officer",
              profileUrl: "https://linkedin.com/in/msterling",
              isVerifiedRole: true,
            },
            {
              name: "Helena Rostova",
              title: "VP of Operations",
              profileUrl: "https://linkedin.com/in/hrostova",
              isVerifiedRole: true,
            },
          ],
        },
      };

      const lead = formatLeadRecord(rawLinkedIn);

      expect(lead.company_name).toBe("NexGen Logistics");
      expect(lead.company_size).toBe("201-500 employees");
      expect(lead.decision_makers).toHaveLength(2);
      expect(lead.decision_makers?.[0].name).toBe("Marcus Sterling");
      expect(lead.decision_makers?.[0].title).toBe("Chief Executive Officer");

      // Verify row export
      const row = formatLeadRowForExport(lead);
      expect(row[0]).toBe("NexGen Logistics");
      expect(row[18]).toBe("linkedin");
      expect(row[23]).toBe("201-500 employees");
      expect(row[24]).toContain("Marcus Sterling (Chief Executive Officer)");
      expect(row[24]).toContain("Helena Rostova (VP of Operations)");
    });
  });

  describe("E2E Deduplication & Zero Email Guessing Guarantee", () => {
    it("should deduplicate multiple entries for the same place/domain", () => {
      const userId = "test_user_uuid";
      const key1 = computeLeadDedupeKey(userId, "Apex Fitness Studio", { website: "https://apexfitness.com" });
      const key2 = computeLeadDedupeKey(userId, "Apex Fitness Studio", { website: "https://apexfitness.com/" });
      const key3 = computeLeadDedupeKey(userId, "Another Gym", { website: "https://anothergym.com" });

      expect(key1).toBe(key2); // Dedupe matches despite trailing slash
      expect(key1).not.toBe(key3);

      const { uniqueLeads, duplicateCount } = filterDuplicateLeads(
        userId,
        [
          { companyName: "Apex Fitness Studio", website: "https://apexfitness.com" } as any,
          { companyName: "Apex Fitness Studio", website: "https://apexfitness.com/" } as any,
          { companyName: "Another Gym", website: "https://anothergym.com" } as any,
        ],
        new Set()
      );
      expect(uniqueLeads).toHaveLength(2);
      expect(duplicateCount).toBe(1);
    });

    it("should never guess or invent emails when website has no email available", () => {
      const rawNoEmail = {
        company_name: "Secretive Holding Co",
        website: "https://secretiveholding.example",
        address: "Delaware, US",
        extra: {},
      };

      const lead = formatLeadRecord(rawNoEmail);
      expect(lead.company_emails).toEqual([]);

      const row = formatLeadRowForExport(lead);
      // Column 1 is Company Emails
      expect(cleanFieldValue(row[1])).toBe("Not Available");
      expect(row[1]).not.toContain("info@secretiveholding.example");
      expect(row[1]).not.toContain("contact@secretiveholding.example");
    });
  });

  describe("E2E Export Formats & Encodings", () => {
    it("should export full lead batch into RFC-4180 CSV, TSV, and HTML table simultaneously", () => {
      const testLeads = [
        {
          company_name: 'Metro "Urban" Clinic, LLC',
          company_emails: ["help@metroclinic.com"],
          company_phones: ["+15559876543"],
          company_website: "https://metroclinic.com",
          company_location: "Austin, Texas",
          rating: 4.7,
          reviews_count: 88,
          source: "google_maps",
        },
        {
          company_name: "Nova SaaS Systems",
          company_emails: ["founders@novasaas.io"],
          company_website: "https://novasaas.io",
          company_location: "San Francisco, CA",
          company_size: "11-50 employees",
          source: "linkedin",
          decision_makers: [{ name: "Alex Rivers", title: "Founder & CEO" }],
        },
      ];

      const rows = testLeads.map(formatLeadRowForExport);

      // 1. CSV
      const csv = generateCsvContent(STANDARD_EXPORT_HEADERS, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true);
      expect(csv).toContain('"Metro ""Urban"" Clinic, LLC"');
      expect(csv).toContain('"Nova SaaS Systems"');

      // 2. TSV
      const tsv = generateTsvContent(STANDARD_EXPORT_HEADERS, rows);
      expect(tsv).toContain("Metro \"Urban\" Clinic, LLC\thelp@metroclinic.com");
      expect(tsv).toContain("Nova SaaS Systems");

      // 3. HTML table
      const html = generateHtmlTableContent(STANDARD_EXPORT_HEADERS, rows);
      expect(html).toContain("<table><thead><tr>");
      expect(html).toContain("Metro &quot;Urban&quot; Clinic, LLC");
      expect(html).toContain("Alex Rivers (Founder &amp; CEO)");
    });
  });
});
