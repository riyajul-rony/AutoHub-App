import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildActorInput,
  groupPersonLeadsByCompany,
  normalizeStateCode,
  mapAgenticDataSeniority,
  mapAgenticDataCompanySize,
  filterOrPrioritizeByLocation,
  searchB2BLeadsApify,
  DEFAULT_B2B_ACTOR_ID,
} from "./b2b-leads.adapter";
import * as client from "./client";
import * as poolService from "./pool-service";

describe("b2b-leads.adapter.ts (AgenticData Apollo Replacement)", () => {
  describe("normalizeStateCode", () => {
    it("converts 2-letter uppercase state codes correctly", () => {
      expect(normalizeStateCode("CA")).toBe("CA");
      expect(normalizeStateCode("NY")).toBe("NY");
      expect(normalizeStateCode("tx")).toBe("TX");
    });

    it("converts full US state names to 2-letter codes", () => {
      expect(normalizeStateCode("California")).toBe("CA");
      expect(normalizeStateCode("New York")).toBe("NY");
      expect(normalizeStateCode("texas")).toBe("TX");
      expect(normalizeStateCode("Florida")).toBe("FL");
    });

    it("returns undefined for invalid or unknown state names", () => {
      expect(normalizeStateCode("")).toBeUndefined();
      expect(normalizeStateCode("Atlantis")).toBeUndefined();
    });
  });

  describe("mapAgenticDataSeniority & mapAgenticDataCompanySize", () => {
    it("maps seniority inputs to AgenticData allowed enums", () => {
      expect(mapAgenticDataSeniority(["cxo"])).toEqual(["c_suite", "founder"]);
      expect(mapAgenticDataSeniority(["vp"])).toEqual(["vp"]);
      expect(mapAgenticDataSeniority(["director", "manager"])).toEqual(["director", "manager"]);
      expect(mapAgenticDataSeniority(["staff"])).toEqual(["senior"]);
    });

    it("maps company sizes to AgenticData headcount bands", () => {
      expect(mapAgenticDataCompanySize("1-10")).toEqual(["1-10"]);
      expect(mapAgenticDataCompanySize("11-50")).toEqual(["11-50"]);
      expect(mapAgenticDataCompanySize("51-200")).toEqual(["51-200"]);
      expect(mapAgenticDataCompanySize("1000+")).toEqual(["1001-5000", "10001+"]);
      expect(mapAgenticDataCompanySize("5001-10000")).toEqual(["5001-10000"]);
    });
  });

  describe("buildActorInput", () => {
    it("maps all search options to AgenticData OpenAPI schema correctly", () => {
      const input = buildActorInput({
        userId: "user-1",
        maxLeads: 50,
        jobTitles: ["CEO", "Founder"],
        seniority: ["cxo", "vp"],
        industry: "Computer Software",
        keywords: "AI SaaS",
        country: "US",
        state: "California",
        city: "San Francisco",
        companySize: "11 to 25",
        requireEmail: true,
        requirePhone: true,
      });

      expect(input.maxResults).toBe(50);
      expect(input.jobTitles).toEqual(["CEO", "Founder"]);
      expect(input.seniority).toEqual(["c_suite", "founder", "vp"]);
      expect(input.personCountry).toEqual(["United States"]);
      expect(input.personState).toEqual(["California"]);
      expect(input.personCity).toEqual(["San Francisco"]);
      expect(input.companyIndustry).toEqual(["computer software"]);
      expect(input.industryKeywords).toEqual(["AI SaaS"]);
      expect(input.includeEmails).toBe(true);
      expect(input.includePhones).toBe(true);
      expect(input.emailStatus).toBe("verified");
      expect(input.companySize).toEqual(["11-50"]);
    });

    it("handles location post-filtering by prioritizing matching countries/states", () => {
      const items = [
        { full_name: "John", country: "US", state: "CA", city: "Los Angeles" },
        { full_name: "Ravi", country: "IN", state: "MH", city: "Mumbai" },
        { full_name: "Sarah", country: "US", state: "TX", city: "Austin" },
      ];

      const res = filterOrPrioritizeByLocation(items, { country: "US", state: "TX" });
      expect(res.filteredOutCount).toBe(1);
      expect(res.items.length).toBe(2);
      expect(res.items[0].full_name).toBe("Sarah");
    });

    it("applies sane defaults when optional filters are omitted", () => {
      const input = buildActorInput({
        userId: "user-1",
        maxLeads: 25,
      });

      expect(input.maxResults).toBe(25);
      expect(input.includeEmails).toBe(true);
      expect(input.emailStatus).toBe("verified");
      expect(input.personCountry).toEqual(["United States"]);
      expect(input.jobTitles).toBeUndefined();
    });
  });

  describe("groupPersonLeadsByCompany", () => {
    it("groups multiple people belonging to the same company with direct mobile phones and LinkedIn URLs", () => {
      const rawRecords = [
        {
          first_name: "Alice",
          last_name: "Smith",
          title: "CEO",
          company: "Acme Corp",
          website: "acme.com",
          email: "alice@acme.com",
          mobile_phone: "+14155552671",
          person_linkedin_url: "https://linkedin.com/in/alicesmith",
          company_linkedin_url: "https://linkedin.com/company/acme",
          city: "San Francisco",
          state: "California",
          country: "United States",
        },
        {
          full_name: "Bob Jones",
          title: "CTO",
          company: "Acme Corp",
          website: "acme.com",
          email: "bob@acme.com",
          work_direct_phone: "+14155552672",
          person_linkedin_url: "https://linkedin.com/in/bobjones",
          city: "San Francisco",
          state: "California",
          country: "United States",
        },
        {
          full_name: "Charlie Brown",
          title: "Managing Director",
          company: "Peanuts LLC",
          website: "peanuts.org",
          email: "charlie@peanuts.org",
          phone: "+12125559090",
          linkedin: "https://linkedin.com/in/charliebrown",
          city: "New York",
          state: "New York",
          country: "United States",
        },
      ];

      const grouped = groupPersonLeadsByCompany(rawRecords);
      expect(grouped).toHaveLength(2);

      const acme = grouped.find((c) => c.companyDomain === "acme.com");
      expect(acme).toBeDefined();
      expect(acme?.decision_makers).toHaveLength(2);
      expect(acme?.decision_makers.map((dm) => dm.name)).toEqual(["Alice Smith", "Bob Jones"]);
      expect(acme?.decision_makers[0].phone).toBe("+14155552671");
      expect(acme?.decision_makers[0].isVerifiedRole).toBe(true);

      const peanuts = grouped.find((c) => c.companyDomain === "peanuts.org");
      expect(peanuts).toBeDefined();
      expect(peanuts?.decision_makers).toHaveLength(1);
      expect(peanuts?.decision_makers[0].phone).toBe("+12125559090");
    });
  });

  describe("searchB2BLeadsApify execution", () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    it("executes AgenticData actor and maps output leads successfully", async () => {
      vi.spyOn(poolService, "withApifyKeyPool").mockImplementation(async (_purpose: string, fn: any) => {
        return fn({
          client: {} as any,
          keyId: "test-key-id",
        });
      });

      vi.spyOn(client, "startActorRun").mockResolvedValue({
        id: "run-agentic-123",
        actId: DEFAULT_B2B_ACTOR_ID,
        defaultDatasetId: "dataset-agentic-123",
        status: "RUNNING",
      });

      vi.spyOn(client, "getActorRun").mockResolvedValue({
        id: "run-agentic-123",
        actId: DEFAULT_B2B_ACTOR_ID,
        status: "SUCCEEDED",
        defaultDatasetId: "dataset-agentic-123",
      });

      vi.spyOn(client, "fetchDatasetItems").mockResolvedValue([
        {
          full_name: "Paul Greene",
          title: "Attorney and Founder",
          company: "Global Sports Advocates",
          website: "globalsportsadvocates.com",
          email: "pgreene@globalsportsadvocates.com",
          mobile_phone: "+12076538303",
          person_linkedin_url: "linkedin.com/in/paul-greene-6a0a3620",
          city: "Portland",
          state: "Maine",
          country: "United States",
          industry: "law practice",
          employees: "1-10",
        },
      ]);

      vi.spyOn(client, "logApifyUsage").mockResolvedValue();

      const result = await searchB2BLeadsApify({
        userId: "user-test",
        maxLeads: 10,
        jobTitles: ["Founder"],
      });

      expect(result.allLeads).toHaveLength(1);
      expect(result.allLeads[0].companyName).toBe("Global Sports Advocates");
      expect(result.allLeads[0].email).toBe("pgreene@globalsportsadvocates.com");
      expect(result.allLeads[0].phoneRaw).toBe("+12076538303");
      expect((result.allLeads[0].extra as any)?.provider).toContain("AgenticData");
    });
  });
});
