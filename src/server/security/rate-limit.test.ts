import { describe, it, expect } from "vitest";
import { MemoryStore, rateLimit } from "./rate-limit";
import { validatePasswordStrength } from "../auth/password";

describe("rateLimit", () => {
  it("blocks after the limit and recovers after the window", async () => {
    const store = new MemoryStore();
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect((await rateLimit("k", 5, 60_000, store, t0 + i)).ok).toBe(true);
    expect((await rateLimit("k", 5, 60_000, store, t0 + 10)).ok).toBe(false);
    expect((await rateLimit("k", 5, 60_000, store, t0 + 61_000)).ok).toBe(true);
  });

  it("isolates keys", async () => {
    const store = new MemoryStore();
    await rateLimit("a", 1, 1000, store, 0);
    expect((await rateLimit("b", 1, 1000, store, 0)).ok).toBe(true);
  });
});

describe("password strength", () => {
  it("requires at least 8 chars", () => {
    expect(validatePasswordStrength("short")).not.toBeNull();
    expect(validatePasswordStrength("longenough")).toBeNull();
  });
});
