import { describe, it, expect } from "vitest";
import {
  mapAgenticDataCompanySize,
  mapAgenticDataSeniority,
  formatB2BApifyError,
  AGENTICDATA_ALLOWED_SENIORITY,
  AGENTICDATA_ALLOWED_SIZES,
} from "./b2b-leads.adapter";

describe("B2B Leads AgenticData Adapter", () => {
  describe("mapAgenticDataSeniority", () => {
    it("maps every allowed seniority individually", () => {
      expect(mapAgenticDataSeniority(["founder"])).toEqual(["founder"]);
      expect(mapAgenticDataSeniority(["owner"])).toEqual(["owner"]);
      expect(mapAgenticDataSeniority(["vp"])).toEqual(["vp"]);
      expect(mapAgenticDataSeniority(["director"])).toEqual(["director"]);
      expect(mapAgenticDataSeniority(["manager"])).toEqual(["manager"]);
      expect(mapAgenticDataSeniority(["senior"])).toEqual(["senior"]);
      expect(mapAgenticDataSeniority(["entry"])).toEqual(["entry"]);
    });

    it("maps UI labels and aliases safely to allowed OpenAPI enum values", () => {
      expect(mapAgenticDataSeniority(["Founder/CXO"])).toEqual(["founder", "c_suite"]);
      expect(mapAgenticDataSeniority(["cxo"])).toEqual(["c_suite", "founder"]);
      expect(mapAgenticDataSeniority(["c_level"])).toEqual(["c_suite"]);
      expect(mapAgenticDataSeniority(["c_suite"])).toEqual(["c_suite"]);
      expect(mapAgenticDataSeniority(["staff"])).toEqual(["senior"]);
    });

    it("ensures mapped seniority values conform to AGENTICDATA_ALLOWED_SENIORITY", () => {
      const allSelected = ["Founder/CXO", "VP", "Director", "Manager", "Senior", "Entry"];
      const mapped = mapAgenticDataSeniority(allSelected);
      expect(mapped).toBeDefined();
      mapped?.forEach((s) => {
        expect(AGENTICDATA_ALLOWED_SENIORITY).toContain(s as any);
      });
    });

    it("filters out unknown values completely", () => {
      expect(mapAgenticDataSeniority(["random_role", "unknown_title"])).toBeUndefined();
      expect(mapAgenticDataSeniority(["random_role", "founder"])).toEqual(["founder"]);
      expect(mapAgenticDataSeniority([])).toBeUndefined();
      expect(mapAgenticDataSeniority(undefined)).toBeUndefined();
    });
  });

  describe("mapAgenticDataCompanySize", () => {
    it("maps company sizes to AgenticData headcount bands", () => {
      expect(mapAgenticDataCompanySize("1-10")).toEqual(["1-10"]);
      expect(mapAgenticDataCompanySize("seed")).toEqual(["1-10"]);
      expect(mapAgenticDataCompanySize("11-50")).toEqual(["11-50"]);
      expect(mapAgenticDataCompanySize("51-200")).toEqual(["51-200"]);
      expect(mapAgenticDataCompanySize("201-500")).toEqual(["201-500"]);
      expect(mapAgenticDataCompanySize("501-1000")).toEqual(["501-1000"]);
      expect(mapAgenticDataCompanySize("1001-5000")).toEqual(["1001-5000"]);
      expect(mapAgenticDataCompanySize("5001-10000")).toEqual(["5001-10000"]);
      expect(mapAgenticDataCompanySize("10000+")).toEqual(["10001+"]);
      expect(mapAgenticDataCompanySize(undefined)).toBeUndefined();
    });

    it("ensures every mapped value conforms to AGENTICDATA_ALLOWED_SIZES", () => {
      const allOptions = ["1-10", "11-50", "51-200", "201-500", "501-1000", "5000+"];
      for (const opt of allOptions) {
        const mapped = mapAgenticDataCompanySize(opt);
        expect(mapped).toBeDefined();
        mapped?.forEach((val) => {
          expect(AGENTICDATA_ALLOWED_SIZES).toContain(val as any);
        });
      }
    });
  });

  describe("formatB2BApifyError", () => {
    it("handles rate limit errors gracefully", () => {
      const err = new Error("Rate limit exceeded: 429 Too Many Requests");
      const friendly = formatB2BApifyError(err);
      expect(friendly).toContain("Apify rate limit reached");
    });

    it("handles monthly usage limit errors gracefully", () => {
      const err = new Error("Monthly usage limit exceeded for current billing cycle");
      const friendly = formatB2BApifyError(err);
      expect(friendly).toContain("Apify monthly credit limit reached");
    });
  });
});
