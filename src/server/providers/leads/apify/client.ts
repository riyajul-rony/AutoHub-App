import { ApifyClient } from "apify-client";
import { getApifyToken, getApifySettings, saveApifyLastTest } from "./config";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import type {
  ApifyRunDetails,
  ApifyConnectionTestResult,
  ApifyRunStatus,
} from "./types";

/**
 * Returns an instantiated ApifyClient using the centrally stored admin token
 */
export async function getApifyClient(customToken?: string): Promise<ApifyClient> {
  const token = customToken || (await getApifyToken());
  if (!token) {
    throw new Error(
      "Service not configured: No active Apify API token found. Contact administrator."
    );
  }
  return new ApifyClient({ token });
}

/**
 * Validates connection against GET /v2/users/me.
 * Never exposes the raw token in return values, logs, or error strings.
 */
export async function testApifyConnection(
  tokenToTest?: string
): Promise<ApifyConnectionTestResult> {
  const token = tokenToTest || (await getApifyToken());
  if (!token || token.trim().length === 0) {
    return {
      ok: false,
      error: "Service not configured: Apify token is missing. Please provide a valid token.",
    };
  }

  try {
    const res = await fetch("https://api.apify.com/v2/users/me", {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        return { ok: false, error: "Invalid Apify API token. Authorization failed (401)." };
      }
      if (res.status === 403) {
        return { ok: false, error: "Apify token lacks required permissions (403)." };
      }
      if (res.status === 429) {
        return { ok: false, error: "Apify rate limit exceeded (429). Please try again shortly." };
      }
      return { ok: false, error: `Apify API returned HTTP status ${res.status}.` };
    }

    const data = await res.json();
    const user = data?.data || {};

    const testRes = {
      ok: true,
      username: user.username || user.name || "Apify Account",
      plan: user.plan?.id || user.plan || "Active Plan",
    };

    await saveApifyLastTest({
      ok: true,
      username: testRes.username,
      plan: testRes.plan,
      testedAt: new Date().toISOString(),
      reason: "OK",
    });

    return testRes;
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to test Apify connection");
    const failureRes = {
      ok: false,
      error: "Could not reach Apify API service. Check network connectivity.",
    };

    await saveApifyLastTest({
      ok: false,
      error: failureRes.error,
      testedAt: new Date().toISOString(),
      reason: "APIFY_UNREACHABLE",
    });

    return failureRes;
  }
}

/**
 * Helper to retry transient 429 / 5xx network errors with exponential backoff
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelayMs = 500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      const isTransient =
        err?.statusCode === 429 ||
        (err?.statusCode >= 500 && err?.statusCode < 600) ||
        err?.code === "ETIMEDOUT" ||
        err?.code === "ECONNRESET";

      if (!isTransient || attempt >= retries) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Starts an actor run with safety caps (maxTotalChargeUsd, timeout, memory)
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, any>,
  options: {
    maxTotalChargeUsd?: number;
    timeoutSecs?: number;
    memoryMbytes?: number;
    client?: ApifyClient;
  } = {}
): Promise<ApifyRunDetails> {
  const client = options.client || (await getApifyClient());
  const settings = await getApifySettings();

  const maxTotalChargeUsd = options.maxTotalChargeUsd ?? settings.limits.maxSpendUsd;
  const timeoutSecs = options.timeoutSecs ?? 3600;
  const memoryMbytes = options.memoryMbytes ?? 4096;

  const run = await withRetry(async () => {
    return await client.actor(actorId).start(input, {
      maxTotalChargeUsd,
      timeout: timeoutSecs,
      memory: memoryMbytes,
    });
  });

  return {
    id: run.id,
    actId: run.actId,
    status: (run.status as ApifyRunStatus) || "RUNNING",
    defaultDatasetId: run.defaultDatasetId,
    startedAt: run.startedAt ? new Date(run.startedAt).toISOString() : new Date().toISOString(),
  };
}

/**
 * Fetches the current run status, usage charges, and dataset information
 */
export async function getActorRun(runId: string, customClient?: ApifyClient): Promise<ApifyRunDetails> {
  const client = customClient || (await getApifyClient());

  const run = await withRetry(async () => {
    return await client.run(runId).get();
  });

  if (!run) {
    throw new Error(`Apify run not found: ${runId}`);
  }

  const usageTotalUsd = (run.usage as any)?.totalChargeUsd ?? (run as any)?.chargedAmountUsd ?? 0;

  return {
    id: run.id,
    actId: run.actId,
    status: (run.status as ApifyRunStatus) || "RUNNING",
    defaultDatasetId: run.defaultDatasetId,
    startedAt: run.startedAt ? new Date(run.startedAt).toISOString() : undefined,
    finishedAt: run.finishedAt ? new Date(run.finishedAt).toISOString() : undefined,
    usageTotalUsd: Number(usageTotalUsd) || undefined,
    chargeUsd: Number(usageTotalUsd) || undefined,
    stats: {
      durationMillis: (run.stats as any)?.durationMillis,
    },
    statusMessage: run.statusMessage,
  };
}

/**
 * Aborts a running actor run on Apify
 */
export async function abortActorRun(runId: string, customClient?: ApifyClient): Promise<boolean> {
  try {
    const client = customClient || (await getApifyClient());
    await client.run(runId).abort();
    return true;
  } catch (err: any) {
    logger.warn({ runId, err: err.message }, "Failed to abort Apify actor run");
    return false;
  }
}

/**
 * Fetches dataset items for a finished run
 */
export async function fetchDatasetItems<T = Record<string, any>>(
  datasetId: string,
  options: { offset?: number; limit?: number; client?: ApifyClient } = {}
): Promise<T[]> {
  const client = options.client || (await getApifyClient());
  const requestedLimit = options.limit ?? 1000;
  const startOffset = options.offset ?? 0;

  if (requestedLimit <= 1000) {
    const dataset = await withRetry(async () => {
      return await client.dataset(datasetId).listItems({
        offset: startOffset,
        limit: requestedLimit,
        clean: true,
      });
    });
    return (dataset.items as unknown as T[]) || [];
  }

  // Multi-page fetch for larger datasets (> 1000 items)
  const allItems: T[] = [];
  let currentOffset = startOffset;
  const pageSize = 1000;

  while (allItems.length < requestedLimit) {
    const fetchCount = Math.min(pageSize, requestedLimit - allItems.length);
    const dataset = await withRetry(async () => {
      return await client.dataset(datasetId).listItems({
        offset: currentOffset,
        limit: fetchCount,
        clean: true,
      });
    });

    const items = (dataset.items as unknown as T[]) || [];
    if (items.length === 0) break;
    allItems.push(...items);
    currentOffset += items.length;
    if (items.length < fetchCount) break;
  }

  return allItems;
}

/**
 * Records an entry into the apify_usage_logs table
 */
export async function logApifyUsage(entry: {
  userId: string;
  module: string;
  actorId: string;
  runId: string;
  itemCount: number;
  estimatedCost: number;
  actualCost?: number;
}): Promise<void> {
  try {
    await db.apify_usage_logs.create({
      data: {
        user_id: entry.userId,
        module: entry.module,
        actor_id: entry.actorId,
        run_id: entry.runId,
        item_count: entry.itemCount,
        estimated_cost: entry.estimatedCost as any,
        actual_cost: entry.actualCost !== undefined ? (entry.actualCost as any) : null,
      },
    });
  } catch (err: any) {
    logger.warn({ err: err.message, runId: entry.runId }, "Failed to record apify_usage_log");
  }
}
