import { startActorRun, getActorRun, fetchDatasetItems, logApifyUsage } from "../client";
import { getApifySettings } from "../config";
import { withApifyKeyPool } from "../pool-service";
import type { RawLead } from "../../types";
import { logger } from "@/server/logger";

export interface GoogleMapsRunParam {
  niche: string;
  location: string;
}

export interface GoogleMapsSearchOptions {
  lines: GoogleMapsRunParam[];
  maxLeadsPerLine: number;
  userId: string;
  onLineProgress?: (lineIndex: number, status: string, count: number) => void;
}

export interface GoogleMapsLineResult {
  niche: string;
  location: string;
  success: boolean;
  runId?: string;
  leads: RawLead[];
  error?: string;
}

/**
 * Executes Google Maps searches using kaix/google-maps-places-scraper
 * with automated key pool routing, load-balancing, and rich field extraction.
 */
export async function searchGoogleMapsKaix(
  options: GoogleMapsSearchOptions
): Promise<{
  allLeads: RawLead[];
  lineResults: GoogleMapsLineResult[];
}> {
  const settings = await getApifySettings();
  const actorId = "kaix/google-maps-places-scraper";
  const unitPrice = settings.unitPrices.google_maps ?? 0.00008;

  const validLines = options.lines.slice(0, settings.limits.maxLinesPerRun);
  const maxLeads = Math.min(
    Math.max(options.maxLeadsPerLine, 1),
    Math.min(Number(settings.limits.maxLeadsPerRun.google_maps) || 100, 1000)
  );

  logger.info(
    { linesCount: validLines.length, actorId, maxLeads, provider: "Apify · kaix" },
    "[Kaix GMaps] Launching Google Maps searches via key pool"
  );

  const linePromises = validLines.map(async (line, index): Promise<GoogleMapsLineResult> => {
    return withApifyKeyPool("google_maps_search", async ({ client, keyId }) => {
      let run: { id: string } | null = null;
      try {
        options.onLineProgress?.(index, `Starting search for "${line.niche}" in "${line.location}"...`, 0);

        const actorInput: Record<string, any> = {
          query: line.niche,
          location: line.location || undefined,
          maxResults: maxLeads,
          searchType: "area",
          includeContacts: false,
          proxyConfiguration: { useApifyProxy: true },
        };

        // Server log input parameters (clean, no tokens)
        logger.info(
          {
            actorId,
            lineIndex: index,
            actorInput,
          },
          "[Kaix GMaps] Starting Apify actor run"
        );

        run = await startActorRun(actorId, actorInput, {
          maxTotalChargeUsd: Math.max(settings.limits.maxSpendUsd, maxLeads * unitPrice * 3),
          client,
        });

        const runUrl = `https://console.apify.com/actors/runs/${run.id}`;
        logger.info(
          {
            actorId,
            runId: run.id,
            runUrl,
          },
          "[Kaix GMaps] Actor run started"
        );

        options.onLineProgress?.(index, "Scraping places from Google Maps (Apify · kaix)...", 0);

        let currentRun = await getActorRun(run.id, client);
        let attempts = 0;
        const maxAttempts = Math.max(120, Math.ceil(maxLeads * 1.5));

        while (
          (currentRun.status === "READY" || currentRun.status === "RUNNING") &&
          attempts < maxAttempts
        ) {
          attempts++;
          await new Promise((r) => setTimeout(r, 3000));
          currentRun = await getActorRun(run.id, client);
        }

        if (currentRun.status !== "SUCCEEDED") {
          const failMsg = currentRun.statusMessage || `Actor run ended with status: ${currentRun.status}`;
          logger.error(
            {
              actorId,
              runId: run.id,
              runUrl,
              runStatus: currentRun.status,
              statusMessage: currentRun.statusMessage,
            },
            "[Kaix GMaps] Actor run did not succeed"
          );
          throw new Error(failMsg);
        }

        options.onLineProgress?.(index, "Fetching extracted places dataset...", 0);

        const items = await fetchDatasetItems<any>(currentRun.defaultDatasetId, {
          limit: maxLeads,
          client,
        });

        const leads: RawLead[] = [];
        for (const item of items) {
          const companyName = (item?.title || item?.name || "").trim();
          if (!item || !companyName) continue;

          const placeId = item.placeId || item.id || `gmaps_${Math.random().toString(36).slice(2, 10)}`;
          const website = item.website?.trim() || undefined;
          const phone = item.phone?.trim() || item.phoneNumber?.trim() || undefined;

          leads.push({
            sourceRef: placeId,
            companyName,
            website,
            phoneRaw: phone,
            phoneE164: phone,
            email: undefined, // enriched in subsequent pipeline step
            address: item.formattedAddress || item.address || undefined,
            city: item.city || undefined,
            country: item.countryCode || undefined,
            businessType: Array.isArray(item.categories) ? item.categories[0] : (item.category || item.businessType || undefined),
            rating: typeof item.rating === "number" ? item.rating : undefined,
            reviewsCount: typeof item.reviewCount === "number" ? item.reviewCount : (typeof item.reviewsCount === "number" ? item.reviewsCount : undefined),
            latitude: typeof item.latitude === "number" ? item.latitude : undefined,
            longitude: typeof item.longitude === "number" ? item.longitude : undefined,
            extra: {
              placeId,
              googleMapsUri: item.googleMapsUri || item.url || undefined,
              categories: item.categories || [],
              provider: "Apify · kaix",
              apifyKeyId: keyId,
            },
          });

          if (leads.length >= maxLeads) {
            break;
          }
        }

        logger.info(
          {
            actorId,
            runId: run.id,
            runUrl,
            runStatus: currentRun.status,
            rawDatasetCount: items.length,
            normalizedCount: leads.length,
          },
          "[Kaix GMaps] Dataset fetched and normalized successfully"
        );

        const estimatedCost = leads.length * unitPrice;
        const actualCost = currentRun.chargeUsd;

        await logApifyUsage({
          userId: options.userId,
          module: "google_maps",
          actorId,
          runId: run.id,
          itemCount: leads.length,
          estimatedCost,
          actualCost,
        });

        options.onLineProgress?.(index, `Discovered ${leads.length} places`, leads.length);

        return {
          niche: line.niche,
          location: line.location,
          success: true,
          runId: run.id,
          leads,
        };
      } catch (err: any) {
        const runUrl = run?.id ? `https://console.apify.com/actors/runs/${run.id}` : undefined;
        logger.error(
          {
            actorId,
            line,
            runId: run?.id,
            runUrl,
            err: err?.message,
          },
          "[Kaix GMaps] Search line failed"
        );
        options.onLineProgress?.(index, `Failed: ${err?.message || "Search failed"}`, 0);
        return {
          niche: line.niche,
          location: line.location,
          success: false,
          runId: run?.id,
          leads: [],
          error: err?.message || "Google Maps scraping failed",
        };
      }
    });
  });

  const lineResults = await Promise.all(linePromises);
  const allLeads = lineResults.flatMap((r) => r.leads);

  return { allLeads, lineResults };
}
