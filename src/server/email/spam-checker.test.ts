import { describe, it, expect } from "vitest";
import { analyzeSpamRisk } from "./spam-checker";

describe("Phase 4: Spam Risk Analyzer", () => {
  it("scores clean, professional cold email as low risk", () => {
    const result = analyzeSpamRisk(
      "Quick question regarding your growth strategy",
      "Hi John,\n\nI was looking at your recent expansion into Brooklyn. We help automotive dealerships streamline inventory leads.\n\nWould you have 10 minutes this Thursday for a brief chat?\n\nBest,\nAlex"
    );

    expect(result.score).toBeLessThan(3);
    expect(result.level).toBe("low");
    expect(result.flags.length).toBe(0);
  });

  it("flags ALL-CAPS subject lines and punctuation", () => {
    const result = analyzeSpamRisk(
      "ACT NOW FOR FREE ACCESS TO MONEY!!!",
      "Check this out now."
    );

    expect(result.score).toBeGreaterThanOrEqual(4);
    expect(result.flags.some((f) => f.type === "caps" || f.type === "formatting")).toBe(true);
    expect(result.suggestions.length).toBeGreaterThan(0);
  });

  it("detects spam trigger words and dollar amounts", () => {
    const result = analyzeSpamRisk(
      "Earn $5,000 guaranteed bonus right now",
      "Dear friend, this is 100% free and no risk with cash prize and million dollars."
    );

    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(result.level).toBe("high");
    expect(result.flags.some((f) => f.type === "trigger_word")).toBe(true);
  });

  it("warns when cold email body has too many links", () => {
    const result = analyzeSpamRisk(
      "Partnership inquiry",
      "Check out https://a.com and https://b.com and https://c.com for our portfolio."
    );

    expect(result.flags.some((f) => f.message.includes("links"))).toBe(true);
  });
});
