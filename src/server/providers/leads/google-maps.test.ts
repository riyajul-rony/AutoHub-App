import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { googleMapsProvider, parseScraperCsv, extractCid } from "./google-maps";
import type { RawLead } from "./types";

describe("GoogleMapsProvider (gosom scraper adapter)", () => {
  const sampleCsv = `input_id,link,title,category,address,open_hours,popular_times,website,phone,plus_code,review_count,review_rating,reviews_per_rating,latitude,longitude,cid,status,descriptions,reviews_link,thumbnail,timezone,price_range,data_id,street_view_url,place_id,images,reservations,order_online,menu,owner,complete_address,credit_cards_accepted,about,user_reviews,user_reviews_extended,emails
1,https://maps.google.com/?cid=101,"Manhattan Dental Arts, LLC","Dentist","470 West End Ave #1B, New York, NY 10024",{},{},"https://www.manhattandentalarts.com/","(212) 247-2330",P273+28,142,4.9,{},40.7812,-73.9811,101,OPERATIONAL,"Modern cosmetic dentistry clinic",{},{},America/New_York,$$,0x89c2588f:0x0000000000000065,{},ChIJtest1,[],[],[],[],{},{},{},{},[],[],"info@manhattandentalarts.com,contact@manhattandentalarts.com"
2,https://maps.google.com/?cid=102,"New York City Smile Design","Cosmetic dentist","8 East 84th St, New York, NY 10028",{},{},"https://www.nycsmiledesign.com/","(212) 421-3418",Q284+99,98,4.8,{},40.7794,-73.9602,102,OPERATIONAL,"Renowned cosmetic smiles",{},{},America/New_York,$$$,0x89c2588e:0x0000000000000066,{},ChIJtest2,[],[],[],[],{},{},{},{},[],[],"appointments@nycsmiledesign.com"
3,https://maps.google.com/?cid=103,"Central Park No-Website Clinic","Dentist","100 Central Park S, New York, NY 10019",{},{},"","(212) 555-0100",P252+11,12,4.2,{},40.7654,-73.9765,103,OPERATIONAL,"Local clinic without web",{},{},America/New_York,$$,0x89c2588d:0x0000000000000067,{},ChIJtest3,[],[],[],[],{},{},{},{},[],[],""
`;

  it("parses scraper CSV with fast-csv correctly", async () => {
    const rows = await parseScraperCsv(sampleCsv);
    expect(rows.length).toBe(3);
    expect(rows[0].title).toBe("Manhattan Dental Arts, LLC");
    expect(rows[0].website).toBe("https://www.manhattandentalarts.com/");
    expect(rows[0].phone).toBe("(212) 247-2330");
    expect(rows[0].emails).toContain("info@manhattandentalarts.com");
    expect(rows[0].cid).toBe("101");
  });

  it("extracts real Google CID correctly from cid, data_id hex or link", () => {
    expect(extractCid({ cid: "10928381928" })).toBe("10928381928");
    // 0x8614cbb7c017c162 in decimal is 9661559868840247650
    expect(extractCid({ data_id: "0x89c25a1641854965:0x8614cbb7c017c162" })).toBe("9661571090678792546");
    expect(extractCid({ link: "https://maps.google.com/?cid=99887766" })).toBe("99887766");
  });

  describe("Unit Tests with Fixture Mock Server", () => {
    let mockServer: http.Server;
    let mockPort: number;

    beforeAll(async () => {
      mockServer = http.createServer((req, res) => {
        const url = req.url || "";
        if (req.method === "POST" && url === "/api/v1/jobs") {
          let body = "";
          req.on("data", (chunk) => (body += chunk));
          req.on("end", () => {
            const parsed = JSON.parse(body);
            expect(parsed.keywords[0]).toContain("dentist in New York");
            expect(parsed.max_time).toBe(300);

            res.writeHead(201, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ id: "mock-job-abc-123" }));
          });
          return;
        }

        if (req.method === "GET" && url === "/api/v1/jobs/mock-job-abc-123") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ Status: "ok", ID: "mock-job-abc-123" }));
          return;
        }

        if (req.method === "GET" && url === "/api/v1/jobs/mock-job-abc-123/download") {
          res.writeHead(200, { "Content-Type": "text/csv" });
          res.end(sampleCsv);
          return;
        }

        res.writeHead(404);
        res.end("Not Found");
      });

      await new Promise<void>((resolve) => {
        mockServer.listen(0, "127.0.0.1", () => {
          const addr = mockServer.address() as any;
          mockPort = addr.port;
          process.env.GMAPS_SCRAPER_URL = `http://127.0.0.1:${mockPort}`;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => mockServer.close(() => resolve()));
      delete process.env.GMAPS_SCRAPER_URL;
    });

    it("fetches, polls, and maps leads for 'dentist' in 'New York'", async () => {
      const leads: RawLead[] = await googleMapsProvider.search({
        keyword: "dentist",
        location: "New York",
        maxResults: 10,
        onlyWithWebsite: true,
        findEmails: true,
      });

      expect(leads.length).toBe(2); // 3rd lead had no website and onlyWithWebsite was true

      // Verify Lead 1
      const lead1 = leads[0];
      expect(lead1.companyName).toBe("Manhattan Dental Arts, LLC");
      expect(lead1.website).toBe("https://www.manhattandentalarts.com/");
      expect(lead1.phoneRaw).toBe("(212) 247-2330");
      expect(lead1.phoneE164).toBe("+12122472330");
      expect(lead1.email).toBe("info@manhattandentalarts.com");
      expect(lead1.businessType).toBe("Dentist");
      expect(lead1.rating).toBe(4.9);
      expect(lead1.reviewsCount).toBe(142);
      expect(lead1.sourceRef).toBe("101");
      expect(lead1.address).toBe("470 West End Ave #1B, New York, NY 10024");
      expect(lead1.city).toBe("New York");

      // Verify Lead 2
      const lead2 = leads[1];
      expect(lead2.companyName).toBe("New York City Smile Design");
      expect(lead2.website).toBe("https://www.nycsmiledesign.com/");
      expect(lead2.phoneE164).toBe("+12124213418");
      expect(lead2.email).toBe("appointments@nycsmiledesign.com");
      expect(lead2.rating).toBe(4.8);
      expect(lead2.reviewsCount).toBe(98);
      expect(lead2.sourceRef).toBe("102");
    });

    it("includes leads without websites when onlyWithWebsite is false", async () => {
      const leads = await googleMapsProvider.search({
        keyword: "dentist",
        location: "New York",
        maxResults: 10,
        onlyWithWebsite: false,
      });

      expect(leads.length).toBe(3);
      expect(leads[2].companyName).toBe("Central Park No-Website Clinic");
      expect(leads[2].website).toBeUndefined();
    });

    it("respects maxResults constraint", async () => {
      const leads = await googleMapsProvider.search({
        keyword: "dentist",
        location: "New York",
        maxResults: 1,
        onlyWithWebsite: false,
      });

      expect(leads.length).toBe(1);
      expect(leads[0].companyName).toBe("Manhattan Dental Arts, LLC");
    });
  });

  describe("Integration Test against Live Real Scraper", () => {
    it("connects to live scraper at 127.0.0.1:8080 and fetches genuine Google Maps leads", async () => {
      let liveScraperActive = false;
      try {
        const ping = await fetch("http://127.0.0.1:8080/api/v1/jobs", { signal: AbortSignal.timeout(1500) });
        liveScraperActive = ping.ok || ping.status === 200;
      } catch {
        liveScraperActive = false;
      }

      if (!liveScraperActive) {
        console.warn("Live scraper not running at 127.0.0.1:8080; skipping live integration test");
        return;
      }

      delete process.env.GMAPS_SCRAPER_URL; // Uses default http://127.0.0.1:8080

      const realLeads = await googleMapsProvider.search({
        keyword: "dentist",
        location: "New York",
        maxResults: 3,
        onlyWithWebsite: true,
      });

      expect(realLeads.length).toBeGreaterThan(0);
      expect(realLeads[0].companyName).toBeTruthy();
      expect(realLeads[0].sourceRef).not.toBe("101"); // Confirms real Google CID/ref
      expect(realLeads[0].website).toMatch(/^https?:\/\//);
    }, 30000);
  });
});
