import { describe, it, expect } from "vitest";
import { computeDueRuns, isMissed } from "./schedule";

const base = { postTimes: ["09:00"], daysOfWeek: [0, 1, 2, 3, 4, 5, 6], timezone: "Asia/Dhaka" };

describe("computeDueRuns", () => {
  it("converts local time to UTC (Dhaka = UTC+6)", () => {
    const runs = computeDueRuns(base, new Date("2026-10-06T00:00:00Z"), new Date("2026-10-07T00:00:00Z"));
    expect(runs.map((d) => d.toISOString())).toEqual(["2026-10-06T03:00:00.000Z"]);
  });

  it("respects days of week", () => {
    // 2026-10-06 is a Tuesday (2)
    const c = { ...base, daysOfWeek: [1] };
    const runs = computeDueRuns(c, new Date("2026-10-06T00:00:00Z"), new Date("2026-10-07T00:00:00Z"));
    expect(runs).toHaveLength(0);
  });

  it("respects start and end dates", () => {
    const c = { ...base, startDate: "2026-10-07", endDate: "2026-10-07" };
    const runs = computeDueRuns(c, new Date("2026-10-05T00:00:00Z"), new Date("2026-10-09T00:00:00Z"));
    expect(runs).toHaveLength(1);
  });

  it("handles DST (America/New_York): 09:00 local is UTC-4 then UTC-5", () => {
    const c = { ...base, timezone: "America/New_York" };
    const before = computeDueRuns(c, new Date("2026-10-31T00:00:00Z"), new Date("2026-11-01T00:00:00Z"));
    const after = computeDueRuns(c, new Date("2026-11-02T00:00:00Z"), new Date("2026-11-03T00:00:00Z"));
    expect(before[0].toISOString()).toBe("2026-10-31T13:00:00.000Z");
    expect(after[0].toISOString()).toBe("2026-11-02T14:00:00.000Z");
  });

  it("supports multiple times per day and sorts them", () => {
    const c = { ...base, postTimes: ["18:00", "09:00"] };
    const runs = computeDueRuns(c, new Date("2026-10-06T00:00:00Z"), new Date("2026-10-07T00:00:00Z"));
    expect(runs).toHaveLength(2);
    expect(runs[0] < runs[1]).toBe(true);
  });
});

describe("isMissed", () => {
  it("flags runs older than 6 hours", () => {
    const now = new Date("2026-10-06T12:00:00Z");
    expect(isMissed(new Date("2026-10-06T05:00:00Z"), now)).toBe(true);
    expect(isMissed(new Date("2026-10-06T07:00:00Z"), now)).toBe(false);
  });
});
