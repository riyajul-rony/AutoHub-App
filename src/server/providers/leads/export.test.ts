import { describe, it, expect } from "vitest";
import {
  STANDARD_EXPORT_HEADERS,
  cleanFieldValue,
  escapeCsvField,
  generateCsvContent,
  generateTsvContent,
  generateHtmlTableContent,
  formatLeadRowForExport,
} from "./export-helpers";

describe("Universal Export Helpers (Phase 5)", () => {
  describe("STANDARD_EXPORT_HEADERS", () => {
    it("should export exactly 25 columns covering standard 18 fields and source intelligence", () => {
      expect(STANDARD_EXPORT_HEADERS).toHaveLength(25);
      expect(STANDARD_EXPORT_HEADERS).toContain("Company Name");
      expect(STANDARD_EXPORT_HEADERS).toContain("Company Emails");
      expect(STANDARD_EXPORT_HEADERS).toContain("Company Phones");
      expect(STANDARD_EXPORT_HEADERS).toContain("Company Website");
      expect(STANDARD_EXPORT_HEADERS).toContain("Founder Name");
      expect(STANDARD_EXPORT_HEADERS).toContain("Manager Name");
      expect(STANDARD_EXPORT_HEADERS).toContain("Source");
      expect(STANDARD_EXPORT_HEADERS).toContain("Rating");
      expect(STANDARD_EXPORT_HEADERS).toContain("Reviews Count");
      expect(STANDARD_EXPORT_HEADERS).toContain("Active Ads Count");
      expect(STANDARD_EXPORT_HEADERS).toContain("Ad Library URL");
      expect(STANDARD_EXPORT_HEADERS).toContain("Company Size");
      expect(STANDARD_EXPORT_HEADERS).toContain("Decision Makers");
    });
  });

  describe("cleanFieldValue", () => {
    it("should return 'Not Available' for null, undefined, empty string, or placeholder values", () => {
      expect(cleanFieldValue(null)).toBe("Not Available");
      expect(cleanFieldValue(undefined)).toBe("Not Available");
      expect(cleanFieldValue("")).toBe("Not Available");
      expect(cleanFieldValue("   ")).toBe("Not Available");
      expect(cleanFieldValue("#ERROR!")).toBe("Not Available");
      expect(cleanFieldValue("—")).toBe("Not Available");
    });

    it("should clean leading plus signs and trim strings", () => {
      expect(cleanFieldValue("+1234567890")).toBe("1234567890");
      expect(cleanFieldValue("  Acme Corp  ")).toBe("Acme Corp");
    });

    it("should join array items with semicolon and filter empty values", () => {
      expect(cleanFieldValue([])).toBe("Not Available");
      expect(cleanFieldValue(["info@example.com", "sales@example.com"])).toBe(
        "info@example.com; sales@example.com"
      );
      expect(cleanFieldValue(["+15550001", "+15550002"])).toBe("15550001; 15550002");
      expect(cleanFieldValue(["Not Available", "contact@test.com"])).toBe("contact@test.com");
    });

    it("should format decision maker objects cleanly", () => {
      const dms = [
        { name: "Sarah Connor", title: "CEO", profileUrl: "https://linkedin.com/in/sarah" },
        { name: "John Doe", title: "CTO" },
      ];
      const result = cleanFieldValue(dms);
      expect(result).toBe("Sarah Connor (CEO) - https://linkedin.com/in/sarah; John Doe (CTO)");
    });
  });

  describe("escapeCsvField (RFC-4180)", () => {
    it("should return empty quotes for 'Not Available'", () => {
      expect(escapeCsvField(null)).toBe('""');
      expect(escapeCsvField("")).toBe('""');
      expect(escapeCsvField("Not Available")).toBe('""');
    });

    it("should quote normal text and escape internal double quotes", () => {
      expect(escapeCsvField("Acme Corp")).toBe('"Acme Corp"');
      expect(escapeCsvField('Acme "Tech" Solutions')).toBe('"Acme ""Tech"" Solutions"');
      expect(escapeCsvField("New York, NY")).toBe('"New York, NY"');
      expect(escapeCsvField("Line 1\nLine 2")).toBe('"Line 1\nLine 2"');
    });
  });

  describe("generateCsvContent", () => {
    it("should prepend UTF-8 BOM (\\uFEFF) and format rows RFC-4180 compliant", () => {
      const headers = ["Company", "Email", "Notes"];
      const rows = [
        ["Acme Inc", "contact@acme.com", 'Special "Deal", 20% off'],
        ["Beta LLC", null, "Standard line"],
      ];

      const csv = generateCsvContent(headers, rows);
      expect(csv.startsWith("\uFEFF")).toBe(true);

      const lines = csv.replace("\uFEFF", "").split("\r\n");
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('"Company","Email","Notes"');
      expect(lines[1]).toBe('"Acme Inc","contact@acme.com","Special ""Deal"", 20% off"');
      expect(lines[2]).toBe('"Beta LLC","","Standard line"');
    });
  });

  describe("generateTsvContent", () => {
    it("should produce clean tab-separated text without internal tabs breaking layout", () => {
      const headers = ["Company", "Location"];
      const rows = [["Acme\tInc", "San\nFrancisco"]];

      const tsv = generateTsvContent(headers, rows);
      const lines = tsv.split("\r\n");
      expect(lines).toHaveLength(2);
      expect(lines[0]).toBe("Company\tLocation");
      expect(lines[1]).toBe("Acme Inc\tSan Francisco");
    });
  });

  describe("generateHtmlTableContent", () => {
    it("should generate a valid HTML table with dark header styling and sanitized content", () => {
      const headers = ["Company", "Website"];
      const rows = [["Acme <Alert>", "https://example.com?a=1&b=2"]];

      const html = generateHtmlTableContent(headers, rows);
      expect(html).toContain("<table><thead><tr>");
      expect(html).toContain('background:#1e293b;color:#ffffff;font-weight:bold;');
      expect(html).toContain("Acme &lt;Alert&gt;");
      expect(html).toContain("https://example.com?a=1&amp;b=2");
      expect(html).toContain("</tr></tbody></table>");
    });
  });

  describe("formatLeadRowForExport", () => {
    it("should correctly format a Google Maps lead into 25 columns", () => {
      const lead = {
        company_name: "Downtown Dental Clinic",
        company_emails: ["info@downtowndental.com"],
        company_phones: ["+15551234567"],
        company_website: "https://downtowndental.com",
        company_facebook: "https://facebook.com/downtowndental",
        company_instagram: "https://instagram.com/downtowndental",
        company_location: "Austin, Texas",
        rating: 4.8,
        reviews_count: 142,
        source: "google_maps",
      };

      const row = formatLeadRowForExport(lead);
      expect(row).toHaveLength(25);
      expect(row[0]).toBe("Downtown Dental Clinic");
      expect(row[1]).toEqual(["info@downtowndental.com"]);
      expect(row[2]).toEqual(["+15551234567"]);
      expect(row[3]).toBe("https://downtowndental.com");
      expect(row[4]).toBe("https://facebook.com/downtowndental");
      expect(row[9]).toBe("Austin, Texas");
      expect(row[18]).toBe("google_maps");
      expect(row[19]).toBe(4.8);
      expect(row[20]).toBe(142);
    });

    it("should correctly format a Meta Ads lead with campaign intelligence", () => {
      const lead = {
        company_name: "Apex Fitness Gear",
        company_emails: ["support@apexgear.com"],
        company_website: "https://apexgear.com",
        source: "meta_ads",
        ad_count: 5,
        ad_library_url: "https://www.facebook.com/ads/library/?id=123456",
        extra: {
          platforms: ["facebook", "instagram"],
        },
      };

      const row = formatLeadRowForExport(lead);
      expect(row).toHaveLength(25);
      expect(row[0]).toBe("Apex Fitness Gear");
      expect(row[18]).toBe("meta_ads");
      expect(row[21]).toBe(5);
      expect(row[22]).toBe("https://www.facebook.com/ads/library/?id=123456");
    });

    it("should correctly format a LinkedIn lead with company size and decision makers", () => {
      const lead = {
        company_name: "CloudScale Inc",
        company_website: "https://cloudscale.io",
        company_linkedin: "https://linkedin.com/company/cloudscale",
        company_size: "51-200 employees",
        source: "linkedin",
        decision_makers: [
          { name: "David Vance", title: "Chief Technology Officer", profileUrl: "https://linkedin.com/in/dvance" },
          { name: "Emily Watson", title: "VP Product", profileUrl: "https://linkedin.com/in/ewatson" },
        ],
      };

      const row = formatLeadRowForExport(lead);
      expect(row).toHaveLength(25);
      expect(row[0]).toBe("CloudScale Inc");
      expect(row[6]).toBe("https://linkedin.com/company/cloudscale");
      expect(row[18]).toBe("linkedin");
      expect(row[23]).toBe("51-200 employees");
      expect(row[24]).toBe(
        "David Vance (Chief Technology Officer) - https://linkedin.com/in/dvance; Emily Watson (VP Product) - https://linkedin.com/in/ewatson"
      );
    });
  });
});
