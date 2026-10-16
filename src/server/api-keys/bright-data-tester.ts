import { logger } from "@/server/logger";

export type BrightDataTestResult = {
  ok: boolean;
  error?: string;
  balance?: number;
  credit?: number;
};

/**
 * Validates a Bright Data API key by querying the customer balance endpoint.
 * Official Bright Data Account API: GET https://api.brightdata.com/customer/balance
 */
export async function testBrightDataKey(apiKey: string): Promise<BrightDataTestResult> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { ok: false, error: "API key cannot be empty" };
  }

  try {
    const res = await fetch("https://api.brightdata.com/customer/balance", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cleanKey}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: "Invalid Bright Data API key. Please check your token in the Bright Data control panel.",
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logger.warn({ status: res.status, errText }, "Bright Data balance check returned non-200");
      return {
        ok: false,
        error: `Bright Data returned HTTP ${res.status}: ${errText || res.statusText}`,
      };
    }

    const data = await res.json().catch(() => ({}));
    return {
      ok: true,
      balance: typeof data.balance === "number" ? data.balance : undefined,
      credit: typeof data.credit === "number" ? data.credit : undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    logger.warn({ err: message }, "Failed to connect to Bright Data API");
    return {
      ok: false,
      error: `Could not reach Bright Data servers: ${message}`,
    };
  }
}
