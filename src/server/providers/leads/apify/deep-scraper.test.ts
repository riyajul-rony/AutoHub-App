import { describe, it, expect } from "vitest";
import { isPrivateIp } from "@/server/net/safe-fetch";
import {
  cleanExtractedEmail,
  decodeCloudflareEmail,
} from "../enrichment";

describe("Deep Web Scraper Security & Extraction", () => {
  describe("SSRF Guard (isPrivateIp)", () => {
    it("blocks loopback and localhost addresses", () => {
      expect(isPrivateIp("127.0.0.1")).toBe(true);
      expect(isPrivateIp("::1")).toBe(true);
      expect(isPrivateIp("localhost")).toBe(true);
    });

    it("blocks cloud metadata service IP (169.254.169.254)", () => {
      expect(isPrivateIp("169.254.169.254")).toBe(true);
      expect(isPrivateIp("169.254.1.1")).toBe(true);
    });

    it("blocks RFC 1918 private IPv4 ranges", () => {
      expect(isPrivateIp("10.0.0.1")).toBe(true);
      expect(isPrivateIp("10.255.255.255")).toBe(true);
      expect(isPrivateIp("172.16.0.1")).toBe(true);
      expect(isPrivateIp("172.31.255.255")).toBe(true);
      expect(isPrivateIp("192.168.0.1")).toBe(true);
      expect(isPrivateIp("192.168.1.100")).toBe(true);
    });

    it("allows genuine public routable IPs", () => {
      expect(isPrivateIp("8.8.8.8")).toBe(false);
      expect(isPrivateIp("93.184.216.34")).toBe(false);
      expect(isPrivateIp("104.244.42.1")).toBe(false);
    });
  });

  describe("Email Extraction & Cleaning", () => {
    it("cleans extracted email and trims glued trailing/leading characters", () => {
      expect(cleanExtractedEmail("   info@dentalaustin.com   ")).toBe("info@dentalaustin.com");
      expect(cleanExtractedEmail("contact@mybusiness.comcontact")).toBe("contact@mybusiness.com");
    });

    it("drops junk image filenames disguised as emails", () => {
      expect(cleanExtractedEmail("logo@2x.png")).toBeNull();
      expect(cleanExtractedEmail("icon@3x.jpg")).toBeNull();
      expect(cleanExtractedEmail("hero@1x.webp")).toBeNull();
    });

    it("decodes Cloudflare-obfuscated email links", () => {
      // Cloudflare email protection XOR decoding
      // Example: 'contact@dentalcare.com' with key 0x5a
      const email = "contact@dentalcare.com";
      const key = 0x5a;
      let hex = key.toString(16).padStart(2, "0");
      for (let i = 0; i < email.length; i++) {
        hex += (email.charCodeAt(i) ^ key).toString(16).padStart(2, "0");
      }

      const decoded = decodeCloudflareEmail(hex);
      expect(decoded).toBe("contact@dentalcare.com");
    });
  });
});
