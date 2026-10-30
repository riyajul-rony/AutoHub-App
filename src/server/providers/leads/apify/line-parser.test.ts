import { describe, it, expect } from "vitest";
import {
  parseMultiLineSearch,
  normalizeLocation,
  parseGoogleMapsLines,
} from "./line-parser";

describe("Google Maps Line Parser", () => {
  it("trims whitespace from queries and locations", () => {
    const input = "   dentist   ,   Austin, TX   \n   gym , Dallas, TX   ";
    const res = parseMultiLineSearch(input);
    expect(res.validCount).toBe(2);
    expect(res.lines[0].niche).toBe("dentist");
    expect(res.lines[0].location).toBe("Austin, TX");
    expect(res.lines[1].niche).toBe("gym");
    expect(res.lines[1].location).toBe("Dallas, TX");
  });

  it("normalizes US state codes correctly", () => {
    // Bare state code
    expect(normalizeLocation("TX")).toBe("Texas, USA");
    expect(normalizeLocation("ca")).toBe("California, USA");
    expect(normalizeLocation("NY")).toBe("New York, USA");

    // City + state code
    expect(normalizeLocation("Austin, TX")).toBe("Austin, Texas, USA");
    expect(normalizeLocation("Miami, FL")).toBe("Miami, Florida, USA");

    // Non-US or already full name
    expect(normalizeLocation("London, UK")).toBe("London, UK");
    expect(normalizeLocation("Tokyo, Japan")).toBe("Tokyo, Japan");
  });

  it("deduplicates lines case-insensitively", () => {
    const input = `restaurant, TX\nRESTAURANT, tx\nRestaurant, Texas\ncoffee shop, CA`;
    const res = parseMultiLineSearch(input);
    // Line 1 and 2 are duplicates of "restaurant, tx"
    expect(res.validCount).toBe(3);
    expect(res.lines.map((l) => l.original)).toEqual([
      "restaurant, TX",
      "Restaurant, Texas",
      "coffee shop, CA",
    ]);
  });

  it("rejects more than 5 lines with exact error", () => {
    const input = `line1, CA\nline2, TX\nline3, FL\nline4, NY\nline5, WA\nline6, IL`;
    const res = parseMultiLineSearch(input, 5);
    expect(res.hasErrors).toBe(true);
    expect(res.error).toBe("Maximum 5 lines allowed. You provided 6 lines.");
  });

  it("flags malformed lines missing location or niche with exact error", () => {
    const input = `just_keyword\n, only_location\nvalid_niche, Dallas, TX`;
    const res = parseMultiLineSearch(input);
    expect(res.lines[0].isValid).toBe(false);
    expect(res.lines[0].error).toBe("Missing location (format: niche, location)");

    expect(res.lines[1].isValid).toBe(false);
    expect(res.lines[1].error).toBe("Niche / keyword is required");

    expect(res.lines[2].isValid).toBe(true);
    expect(res.lines[2].normalizedLocation).toBe("Dallas, Texas, USA");
  });

  it("convenience helper parseGoogleMapsLines separates valid lines and errors", () => {
    const input = `dentist, TX\nbad_line\ncoffee, Austin, TX`;
    const parsed = parseGoogleMapsLines(input);
    expect(parsed.validLines.length).toBe(2);
    expect(parsed.validLines[0]).toEqual({ niche: "dentist", location: "Texas, USA" });
    expect(parsed.validLines[1]).toEqual({ niche: "coffee", location: "Austin, Texas, USA" });
    expect(parsed.errors.length).toBe(1);
    expect(parsed.errors[0].line).toBe("bad_line");
  });
});
