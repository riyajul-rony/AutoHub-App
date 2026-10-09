/**
 * Sliding-window rate limiter.
 * Default store is in-process memory (fine for a single web container).
 * The `RateLimitStore` interface lets us swap in Redis without touching callers.
 */
export interface RateLimitStore {
  /** Record a hit and return the number of hits inside the window (including this one). */
  hit(key: string, windowMs: number, now: number): number | Promise<number>;
}

export class MemoryStore implements RateLimitStore {
  private hits = new Map<string, number[]>();

  hit(key: string, windowMs: number, now: number): number {
    const arr = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    arr.push(now);
    this.hits.set(key, arr);
    if (this.hits.size > 10_000) this.gc(windowMs, now);
    return arr.length;
  }

  private gc(windowMs: number, now: number) {
    for (const [k, v] of this.hits) {
      if (v.every((t) => now - t >= windowMs)) this.hits.delete(k);
    }
  }
}

const globalStore = (globalThis as unknown as { __rl?: RateLimitStore }).__rl ?? new MemoryStore();
(globalThis as unknown as { __rl?: RateLimitStore }).__rl = globalStore;

export type RateLimitResult = { ok: boolean; remaining: number };

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  store: RateLimitStore = globalStore,
  now = Date.now(),
): Promise<RateLimitResult> {
  const count = await store.hit(key, windowMs, now);
  return { ok: count <= limit, remaining: Math.max(0, limit - count) };
}
