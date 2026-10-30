import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import http from "http";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import {
  categorizeEmail,
  normalizePhone,
  decodeCloudflareEmail,
  scrapeFullCompanyProfile,
  formatSocialUrl,
} from "./enrichment";

// Mock session
vi.mock("@/server/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

import { getSessionUser } from "@/server/auth/session";
import { POST as enrichSinglePost } from "@/app/api/v1/leads/[id]/enrich/route";
import { POST as enrichBatchPost } from "@/app/api/v1/leads/enrich-batch/route";

describe("Phase 4: Website Scraper & Lead Enrichment Pipeline", () => {
  let mockServer: http.Server;
  let mockPort: number;
  let mockBaseUrl: string;

  const USER_A_ID = "44444444-4444-4444-4444-444444444441";
  const USER_B_ID = "44444444-4444-4444-4444-444444444442";

  const sampleHomeHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Beacon Dental Clinic</title>
        <meta property="business:contact_data:phone_number" content="(212) 555-0199">
      </head>
      <body>
        <nav>
          <a href="/about">About Us</a>
          <a href="/team">Meet Our Dentists</a>
          <a href="/contact">Contact Us</a>
          <a href="/services">Our Treatments</a>
        </nav>
        <h1>Welcome to Beacon Dental</h1>
        <p>Serving Manhattan since 2010.</p>
        <footer>
          <a href="https://facebook.com/beacondentalclinic">Facebook</a>
          <a href="https://instagram.com/beacondentalclinic/">Instagram</a>
          <a href="https://linkedin.com/company/beacon-dental">LinkedIn</a>
          <a href="https://twitter.com/beacondental">Twitter</a>
          <a href="https://tiktok.com/@beacondental">TikTok</a>
          <a href="https://youtube.com/@beacondental">YouTube</a>
        </footer>
      </body>
    </html>
  `;

  // Encoded Cloudflare email for "contact@beacondental.com"
  // key = 0x3f
  const contactEmail = "contact@beacondental.com";
  let cfEncodedContact = "3f";
  for (let i = 0; i < contactEmail.length; i++) {
    cfEncodedContact += (contactEmail.charCodeAt(i) ^ 0x3f).toString(16).padStart(2, "0");
  }

  const sampleContactHtml = `
    <!DOCTYPE html>
    <html>
      <body>
        <h2>Contact Beacon Dental</h2>
        <p>Email: <a href="/email-protection#${cfEncodedContact}">[email&#160;protected]</a></p>
        <p>Phone: +1 212-555-0199</p>
        <p>Office Manager: Jennifer Vance (Office Manager)</p>
      </body>
    </html>
  `;

  const sampleTeamHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Dentist",
          "name": "Beacon Dental Clinic",
          "founder": {
            "@type": "Person",
            "name": "Dr. Marcus Brody",
            "jobTitle": "Lead Dentist & Founder",
            "email": "dr.marcus@beacondental.com",
            "telephone": "+1 212-555-0144"
          }
        }
        </script>
      </head>
      <body>
        <h2>Our Doctors</h2>
        <div class="doctor-card">
          <h3>Dr. Marcus Brody</h3>
          <p>Founder & Head of Surgery</p>
          <p>Reach out: dr.marcus [at] beacondental [dot] com</p>
        </div>
      </body>
    </html>
  `;

  beforeAll(async () => {
    mockServer = http.createServer((req, res) => {
      const url = req.url || "/";
      if (url === "/" || url === "") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(sampleHomeHtml);
        return;
      }
      if (url === "/contact" || url === "/contact-us") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(sampleContactHtml);
        return;
      }
      if (url === "/team" || url === "/about") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(sampleTeamHtml);
        return;
      }
      if (url === "/services") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <body>
              <h2>Treatments & Services</h2>
              <p>Book online or email us at appointments@beacondental.com or call 212-555-4321.</p>
            </body>
          </html>
        `);
        return;
      }
      res.writeHead(404);
      res.end("Not Found");
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address() as any;
        mockPort = addr.port;
        mockBaseUrl = `http://127.0.0.1:${mockPort}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Heuristic Extraction & De-obfuscation", () => {
    it("de-obfuscates Cloudflare protected emails", () => {
      const decoded = decodeCloudflareEmail(cfEncodedContact);
      expect(decoded).toBe("contact@beacondental.com");
    });

    it("categorizes personal, role, and generic email addresses", () => {
      expect(categorizeEmail("info@clinic.com")).toBe("role");
      expect(categorizeEmail("support@app.io")).toBe("role");
      expect(categorizeEmail("team@startup.com")).toBe("generic");
      expect(categorizeEmail("marcus.brody@beacondental.com")).toBe("personal");
    });

    it("normalizes phone numbers to standard E.164", () => {
      const normUS = normalizePhone("(212) 555-0199", "US");
      expect(normUS.e164).toBe("+12125550199");
    });

    it("formats and normalizes social media profile links", () => {
      expect(formatSocialUrl("beacondental", "facebook")).toBe("https://www.facebook.com/beacondental");
      expect(formatSocialUrl("https://instagram.com/beacondental/?utm_source=ig", "instagram")).toBe(
        "https://instagram.com/beacondental/"
      );
    });
  });

  describe("2. Single Lead Enrichment API (POST /api/v1/leads/[id]/enrich)", () => {
    let leadAId: string;
    let leadBId: string;

    beforeEach(async () => {
      const leadA = await db.leads.create({
        data: {
          id: `lead-a-${Date.now()}`,
          user_id: USER_A_ID,
          company_name: "Beacon Dental",
          website: mockBaseUrl,
          address: "New York, NY",
          source: "google_maps",
          status: "new",
        },
      });
      leadAId = leadA.id;

      const leadB = await db.leads.create({
        data: {
          id: `lead-b-${Date.now()}`,
          user_id: USER_B_ID,
          company_name: "User B Private Co",
          website: mockBaseUrl,
          source: "google_maps",
          status: "new",
        },
      });
      leadBId = leadB.id;
    });

    it("rejects unauthorized requests with 401", async () => {
      (getSessionUser as any).mockResolvedValue(null);

      const req = new NextRequest(`http://localhost/api/v1/leads/${leadAId}/enrich`, {
        method: "POST",
      });
      const res = await enrichSinglePost(req, { params: Promise.resolve({ id: leadAId }) });
      expect(res.status).toBe(401);
    });

    it("enforces tenant isolation: User A cannot enrich User B's lead (returns 404)", async () => {
      (getSessionUser as any).mockResolvedValue({
        sessionId: "session-a",
        user: { id: USER_A_ID, email: "usera@example.com", role: "user" },
      });

      const req = new NextRequest(`http://localhost/api/v1/leads/${leadBId}/enrich`, {
        method: "POST",
      });
      const res = await enrichSinglePost(req, { params: Promise.resolve({ id: leadBId }) });
      expect(res.status).toBe(404);
    });

    it("successfully crawls website, discovers founder and contact email, and updates lead", async () => {
      (getSessionUser as any).mockResolvedValue({
        sessionId: "session-a",
        user: { id: USER_A_ID, email: "usera@example.com", role: "user" },
      });

      const req = new NextRequest(`http://localhost/api/v1/leads/${leadAId}/enrich`, {
        method: "POST",
      });
      const res = await enrichSinglePost(req, { params: Promise.resolve({ id: leadAId }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.email).toBeTruthy();
      expect(body.data.email_status).toBe("valid");

      // Verify updated record in DB
      const updated = await db.leads.findUnique({ where: { id: leadAId } });
      expect(updated.email).toBeTruthy();
      expect(updated.extra?.founder_name || updated.extra?.profile?.founder_name).toContain("Marcus Brody");
      expect(updated.facebook_url).toContain("facebook.com/beacondentalclinic");
      expect(updated.instagram_url).toContain("instagram.com/beacondentalclinic");
      expect(updated.linkedin_url).toContain("linkedin.com/company/beacon-dental");
      expect(updated.extra?.twitter_url).toContain("twitter.com/beacondental");
      expect(updated.extra?.tiktok_url).toContain("tiktok.com/@beacondental");
      expect(updated.extra?.youtube_url).toContain("youtube.com/@beacondental");

      // Verify subpage crawl reached /services and extracted business email
      const compEmails = updated.extra?.profile?.company_emails || [];
      expect(compEmails.some((e: string) => e.includes("appointments@beacondental.com") || e.includes("contact@beacondental.com"))).toBe(true);

      // Verify authentic personal email
      expect(updated.extra?.founder_email).toBe("dr.marcus@beacondental.com");
    }, 20000);
  });

  describe("3. Batch Lead Enrichment API (POST /api/v1/leads/enrich-batch)", () => {
    let batchIds: string[] = [];

    beforeEach(async () => {
      batchIds = [];
      for (let i = 1; i <= 3; i++) {
        const lead = await db.leads.create({
          data: {
            id: `lead-batch-${i}-${Date.now()}`,
            user_id: USER_A_ID,
            company_name: `Beacon Dental Branch ${i}`,
            website: mockBaseUrl,
            source: "google_maps",
            status: "new",
          },
        });
        batchIds.push(lead.id);
      }
    });

    it("rejects unauthorized batch requests with 401", async () => {
      (getSessionUser as any).mockResolvedValue(null);

      const req = new NextRequest("http://localhost/api/v1/leads/enrich-batch", {
        method: "POST",
        body: JSON.stringify({ leadIds: batchIds }),
      });
      const res = await enrichBatchPost(req);
      expect(res.status).toBe(401);
    });

    it("enriches batch leads with concurrency control and updates DB records", async () => {
      (getSessionUser as any).mockResolvedValue({
        sessionId: "session-a",
        user: { id: USER_A_ID, email: "usera@example.com", role: "user" },
      });

      const req = new NextRequest("http://localhost/api/v1/leads/enrich-batch", {
        method: "POST",
        body: JSON.stringify({ leadIds: batchIds }),
      });
      const res = await enrichBatchPost(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.data.totalProcessed).toBe(3);
      expect(body.data.enrichedCount).toBeGreaterThan(0);

      // Verify records in DB
      const checkLead = await db.leads.findUnique({ where: { id: batchIds[0] } });
      expect(checkLead.email).toBeTruthy();
    });
  });
});
