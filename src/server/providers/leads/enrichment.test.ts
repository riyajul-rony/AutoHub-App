import { describe, it, expect } from "vitest";
import { categorizeEmail, normalizePhone } from "./enrichment";

describe("Leads enrichment helpers", () => {
  it("categorizes role vs personal emails", () => {
    expect(categorizeEmail("info@agency.com")).toBe("role");
    expect(categorizeEmail("contact@firm.com")).toBe("role");
    expect(categorizeEmail("sales@shop.com")).toBe("role");
    expect(categorizeEmail("team@startup.com")).toBe("generic");
    expect(categorizeEmail("john.doe@enterprise.com")).toBe("personal");
  });

  it("normalizes phone numbers to E.164", () => {
    const resBD = normalizePhone("01711234567", "BD");
    expect(resBD.e164).toBe("+8801711234567");

    const resUS = normalizePhone("(415) 555-2671", "US");
    expect(resUS.e164).toBe("+14155552671");
  });

  it("decodes Cloudflare protected emails", async () => {
    const { decodeCloudflareEmail } = await import("./enrichment");
    // Cloudflare email encoded "info@hotelnewyork.nl"
    // Let's encode it: k = 0x5a
    const raw = "info@hotelnewyork.nl";
    const k = 0x5a;
    let enc = k.toString(16).padStart(2, "0");
    for (let i = 0; i < raw.length; i++) {
      enc += (raw.charCodeAt(i) ^ k).toString(16).padStart(2, "0");
    }
    expect(decodeCloudflareEmail(enc)).toBe("info@hotelnewyork.nl");
  });

  it("initializes scrapeFullCompanyProfile with seeded data correctly", async () => {
    const { scrapeFullCompanyProfile } = await import("./enrichment");
    const profile = await scrapeFullCompanyProfile("Not Available", {
      name: "Acme Legal Partners",
      location: "Los Angeles",
      phone: "+1 213 555 0199",
      email: "contact@acmelegal.com",
      operator: "Sarah Connor",
      facebook: "https://facebook.com/acmelegal",
    });

    expect(profile.company_name).toBe("Acme Legal Partners");
    expect(profile.company_emails).toContain("contact@acmelegal.com");
    expect(profile.founder_name).toBe("Sarah Connor");
    expect(profile.company_facebook).toBe("https://facebook.com/acmelegal");
  }, 15000);
});
