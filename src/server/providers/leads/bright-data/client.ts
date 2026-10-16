import { logger } from "../../../logger";
import type { BrightDataProgressResponse, BrightDataTriggerResponse } from "./types";

export class BrightDataClient {
  private defaultBaseUrl: string;

  constructor(baseUrl = process.env.BRIGHT_DATA_API_BASE_URL || "https://api.brightdata.com") {
    this.defaultBaseUrl = baseUrl.replace(/\/+$/, "");
  }

  /**
   * Triggers a scraping dataset job on Bright Data v3.
   * Returns snapshot_id.
   */
  async triggerDataset(
    datasetId: string,
    input: any[],
    apiKey: string,
    baseUrl = this.defaultBaseUrl
  ): Promise<string> {
    const url = `${baseUrl}/datasets/v3/trigger?dataset_id=${encodeURIComponent(datasetId)}&format=json`;

    logger.info({ datasetId, inputCount: input.length }, "Triggering Bright Data dataset");

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      let errText = "";
      try {
        errText = await res.text();
      } catch {}

      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid or unauthorized Bright Data API key. Please check your key in Settings.");
      }
      throw new Error(`Bright Data API trigger failed (${res.status}): ${errText || res.statusText}`);
    }

    const data = (await res.json()) as BrightDataTriggerResponse;
    if (!data || !data.snapshot_id) {
      throw new Error("Bright Data trigger did not return a snapshot_id");
    }

    return data.snapshot_id;
  }

  /**
   * Checks the progress of a dataset snapshot job.
   */
  async checkProgress(
    snapshotId: string,
    apiKey: string,
    baseUrl = this.defaultBaseUrl
  ): Promise<BrightDataProgressResponse> {
    const url = `${baseUrl}/datasets/v3/progress/${encodeURIComponent(snapshotId)}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      let errText = "";
      try {
        errText = await res.text();
      } catch {}
      throw new Error(`Bright Data progress check failed (${res.status}): ${errText || res.statusText}`);
    }

    return (await res.json()) as BrightDataProgressResponse;
  }

  /**
   * Downloads the completed snapshot data.
   * Handles both JSON array and newline-delimited JSON (JSONL).
   */
  async downloadSnapshot<T>(
    snapshotId: string,
    apiKey: string,
    baseUrl = this.defaultBaseUrl
  ): Promise<T[]> {
    const url = `${baseUrl}/datasets/v3/snapshot/${encodeURIComponent(snapshotId)}?format=json`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!res.ok) {
      let errText = "";
      try {
        errText = await res.text();
      } catch {}
      throw new Error(`Bright Data snapshot download failed (${res.status}): ${errText || res.statusText}`);
    }

    const rawText = await res.text();
    const trimmed = rawText.trim();
    if (!trimmed) {
      return [];
    }

    // Attempt direct JSON parse
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        return JSON.parse(trimmed) as T[];
      } catch (err) {
        logger.warn({ err }, "Failed to parse JSON array from snapshot, attempting JSONL");
      }
    }

    // Fallback: parse JSONL (one JSON object per line)
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    const results: T[] = [];
    for (const line of lines) {
      try {
        results.push(JSON.parse(line));
      } catch {
        // Skip unparseable lines
      }
    }

    return results;
  }

  /**
   * Orchestrates trigger -> polling until ready -> downloading snapshot data.
   */
  async executeDatasetQuery<T>(params: {
    datasetId: string;
    input: any[];
    apiKey: string;
    maxWaitMs?: number;
    pollIntervalMs?: number;
    baseUrl?: string;
  }): Promise<T[]> {
    const {
      datasetId,
      input,
      apiKey,
      maxWaitMs = 180000, // 3 minutes timeout
      pollIntervalMs = 2500,
      baseUrl = this.defaultBaseUrl,
    } = params;

    const snapshotId = await this.triggerDataset(datasetId, input, apiKey, baseUrl);

    const startTime = Date.now();
    let delay = pollIntervalMs;

    while (Date.now() - startTime < maxWaitMs) {
      const progress = await this.checkProgress(snapshotId, apiKey, baseUrl);

      if (progress.status === "ready") {
        return await this.downloadSnapshot<T>(snapshotId, apiKey, baseUrl);
      }

      if (progress.status === "failed") {
        throw new Error(
          `Bright Data scraping job failed: ${progress.message || "Unknown Bright Data provider error"}`
        );
      }

      // Sleep before next poll
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Linear backoff up to 5 seconds
      delay = Math.min(delay + 500, 5000);
    }

    throw new Error(`Bright Data scraping job timed out after ${Math.round(maxWaitMs / 1000)}s`);
  }
}

export const brightDataClient = new BrightDataClient();
