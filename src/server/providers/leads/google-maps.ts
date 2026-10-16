import { getConfig } from "../../config";
import type { LeadSourceProvider, LeadSearchParams, RawLead } from "./types";
import { logger } from "../../logger";
import { normalizePhone, resolveOfficialWebsite } from "./enrichment";
import { parseString } from "fast-csv";

export { resolveOfficialWebsite };

// Timestamp of the last scrape job submitted (safety delay to prevent IP bans)
let lastJobTime = 0;

// In-memory queue to guarantee only 1 scrape job runs at a time (optimized for 1 vCPU / 4 GB VPS)
let activeJobPromise: Promise<any> = Promise.resolve();
let queuedJobsCount = 0;

export function getScrapeQueueStatus() {
  return {
    isBusy: queuedJobsCount > 0,
    queuedCount: queuedJobsCount,
  };
}

export interface GosomScraperRow {
  input_id?: string;
  link?: string;
  title?: string;
  category?: string;
  address?: string;
  open_hours?: string;
  popular_times?: string;
  website?: string;
  phone?: string;
  plus_code?: string;
  review_count?: string;
  review_rating?: string;
  reviews_per_rating?: string;
  latitude?: string;
  longitude?: string;
  cid?: string;
  status?: string;
  descriptions?: string;
  reviews_link?: string;
  thumbnail?: string;
  timezone?: string;
  price_range?: string;
  data_id?: string;
  street_view_url?: string;
  place_id?: string;
  images?: string;
  reservations?: string;
  order_online?: string;
  menu?: string;
  owner?: string;
  complete_address?: string;
  credit_cards_accepted?: string;
  about?: string;
  user_reviews?: string;
  user_reviews_extended?: string;
  emails?: string;
}

export function parseScraperCsv(csvContent: string): Promise<GosomScraperRow[]> {
  return new Promise((resolve, reject) => {
    const rows: GosomScraperRow[] = [];
    parseString<GosomScraperRow, GosomScraperRow>(csvContent, {
      headers: true,
      ignoreEmpty: true,
      trim: true,
    })
      .on("data", (row) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", (err) => reject(err));
  });
}

export function detectCountryCode(loc: string): any {
  const l = (loc || "").toLowerCase();
  if (/\b(us|usa|united states|new york|ny|los angeles|chicago|houston|miami|san francisco|california|texas|florida|seattle|austin|boston)\b/i.test(l)) {
    return "US";
  }
  if (/\b(uk|united kingdom|england|great britain|london|manchester|birmingham|leeds|glasgow)\b/i.test(l)) {
    return "GB";
  }
  if (/\b(bangladesh|bd|dhaka|chittagong|sylhet|rajshahi|khulna)\b/i.test(l)) {
    return "BD";
  }
  if (/\b(canada|ca|toronto|vancouver|montreal|calgary|ottawa)\b/i.test(l)) {
    return "CA";
  }
  if (/\b(australia|au|sydney|melbourne|brisbane|perth|adelaide)\b/i.test(l)) {
    return "AU";
  }
  if (/\b(germany|de|berlin|munich|hamburg|frankfurt)\b/i.test(l)) {
    return "DE";
  }
  if (/\b(france|fr|paris|marseille|lyon)\b/i.test(l)) {
    return "FR";
  }
  return "US";
}

/**
 * Fast static coordinates table + Nominatim fallback to resolve lat/lon for any query.
 * Providing lat/lon ensures fast_mode succeeds instantly and avoids Google bot blockers.
 */
const KNOWN_COORDINATES: Record<string, { lat: string; lon: string }> = {
  "new york": { lat: "40.7128", lon: "-74.0060" },
  "new york, ny": { lat: "40.7128", lon: "-74.0060" },
  "ny": { lat: "40.7128", lon: "-74.0060" },
  "los angeles": { lat: "34.0522", lon: "-118.2437" },
  "chicago": { lat: "41.8781", lon: "-87.6298" },
  "houston": { lat: "29.7604", lon: "-95.3698" },
  "miami": { lat: "25.7617", lon: "-80.1918" },
  "san francisco": { lat: "37.7749", lon: "-122.4194" },
  "austin": { lat: "30.2672", lon: "-97.7431" },
  "seattle": { lat: "47.6062", lon: "-122.3321" },
  "boston": { lat: "42.3601", lon: "-71.0589" },
  "london": { lat: "51.5074", lon: "-0.1278" },
  "paris": { lat: "48.8566", lon: "2.3522" },
  "berlin": { lat: "52.5200", lon: "13.4050" },
  "toronto": { lat: "43.6532", lon: "-79.3832" },
  "sydney": { lat: "-33.8688", lon: "151.2093" },
  "dhaka": { lat: "23.8103", lon: "90.4125" },
};

export async function resolveLocationCoordinates(location: string): Promise<{ lat: string; lon: string }> {
  const norm = location.trim().toLowerCase();
  if (KNOWN_COORDINATES[norm]) {
    return KNOWN_COORDINATES[norm];
  }
  for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
    if (norm.includes(key)) {
      return coords;
    }
  }

  // Fallback: fast lookup via Nominatim OpenStreetMap
  try {
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    const res = await fetch(geoUrl, {
      headers: { "User-Agent": "AutoHubLeadFinder/2.0" },
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
        return {
          lat: String(parseFloat(data[0].lat).toFixed(4)),
          lon: String(parseFloat(data[0].lon).toFixed(4)),
        };
      }
    }
  } catch {
    // Ignore timeout / network failure
  }

  // Default to New York if unresolvable
  return { lat: "40.7128", lon: "-74.0060" };
}

/**
 * Extracts the real Google CID (Customer ID) from scraper output without using any counter.
 * If cid is missing, decodes the 64-bit hexadecimal part of data_id into its decimal CID.
 */
export function extractCid(row: GosomScraperRow): string {
  if (row.cid && row.cid.trim()) {
    return row.cid.trim();
  }
  if (row.data_id && row.data_id.includes(":")) {
    const parts = row.data_id.split(":");
    const hex = parts[1]?.trim();
    if (hex && hex.startsWith("0x")) {
      try {
        const dec = BigInt(hex).toString();
        if (dec && dec !== "0") {
          return dec;
        }
      } catch {
        // Fall through
      }
    }
  }
  if (row.link && row.link.includes("cid=")) {
    const match = row.link.match(/cid=([0-9]+)/);
    if (match?.[1]) {
      return match[1];
    }
  }
  if (row.link && row.link.trim()) {
    return row.link.trim();
  }
  if (row.place_id && row.place_id.trim()) {
    return row.place_id.trim();
  }
  if (row.data_id && row.data_id.trim()) {
    return row.data_id.trim();
  }
  return "";
}

export class GoogleMapsProvider implements LeadSourceProvider {
  id = "google_maps" as const;

  async search(params: LeadSearchParams): Promise<RawLead[]> {
    const keyword = (params.keyword || "").trim();
    const location = (params.location || "").trim();

    if (!keyword || !location) {
      throw new Error("Both keyword and location are required for Google Maps lead search.");
    }

    // Queue scrape jobs so ONLY ONE runs at a time (protects 1 vCPU / 4 GB RAM VPS)
    queuedJobsCount++;
    const currentRun = activeJobPromise.then(() => this.executeScrapeJob(params));
    activeJobPromise = currentRun.catch(() => {});

    try {
      return await currentRun;
    } finally {
      queuedJobsCount = Math.max(0, queuedJobsCount - 1);
    }
  }

  private async executeScrapeJob(params: LeadSearchParams): Promise<RawLead[]> {
    const keyword = (params.keyword || "").trim();
    const location = (params.location || "").trim();

    // Configurable Max Results Cap
    const capConfig = process.env.GMAPS_MAX_RESULTS_CAP;
    const maxResultsCap = capConfig ? Math.max(1, parseInt(capConfig, 10)) : 100;
    const targetCount = Math.min(Math.max(params.maxResults || 15, 1), maxResultsCap);
    const requireWebsite = params.onlyWithWebsite !== false;

    // 1. Resolve scraper service URL (defaults to embedded scraper at 127.0.0.1:8080)
    const configUrl = process.env.GMAPS_SCRAPER_URL;
    const baseUrl = (configUrl || "http://127.0.0.1:8080").replace(/\/+$/, "");

    // 2. Safety rate limit / delay between consecutive scrape jobs (configurable, default: 2500ms)
    const intervalConfig = process.env.GMAPS_MIN_JOB_INTERVAL_MS;
    const minJobIntervalMs = intervalConfig ? parseInt(intervalConfig, 10) : 2500;
    const now = Date.now();
    const elapsed = now - lastJobTime;
    if (elapsed < minJobIntervalMs) {
      await new Promise((resolve) => setTimeout(resolve, minJobIntervalMs - elapsed));
    }
    lastJobTime = Date.now();

    // 3. Fast mode configuration (configurable via GMAPS_FAST_MODE, default: true)
    const fastModeConfig = process.env.GMAPS_FAST_MODE;
    const fastMode = fastModeConfig === "false" ? false : true;

    // Resolve geographic coordinates for location
    const coords = await resolveLocationCoordinates(location);

    // 4. Submit scrape job to gosom/google-maps-scraper REST API
    const searchQuery = `${keyword} in ${location}`.trim();
    // Depth: 1 depth level roughly yields 20 listings in Google Maps
    const depth = Math.min(Math.max(1, Math.ceil(targetCount / 15)), 10);
    const jobPayload = {
      name: `autohub_${Date.now()}`,
      keywords: [searchQuery],
      lang: "en",
      zoom: 15,
      lat: coords.lat,
      lon: coords.lon,
      depth,
      max_time: 300,
      fast_mode: fastMode,
      radius: 10000,
      email: params.findEmails !== false,
    };

    logger.info({ baseUrl, searchQuery, depth, targetCount, fastMode, coords }, "Submitting Google Maps scraping job to scraper service");

    let jobId: string;
    try {
      const createRes = await fetch(`${baseUrl}/api/v1/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(jobPayload),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text().catch(() => "");
        throw new Error(`Scraper service rejected job creation (HTTP ${createRes.status}): ${errorText}`);
      }

      const createData = (await createRes.json()) as { id?: string };
      if (!createData.id) {
        throw new Error("Scraper service did not return a valid job ID.");
      }
      jobId = createData.id;
    } catch (err: any) {
      if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed") || err.message?.includes("ECONNREFUSED")) {
        throw new Error(
          `Google Maps Scraper service is unreachable at ${baseUrl}. Ensure the embedded scraper service is active.`
        );
      }
      throw err;
    }

    // 5. Poll job status until complete (with hard timeout)
    const pollIntervalMs = 1500;
    const maxPollTimeMs = 180_000; // 3 minutes timeout
    const startTime = Date.now();
    let jobFinished = false;

    while (Date.now() - startTime < maxPollTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      try {
        const statusRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`, {
          headers: { Accept: "application/json" },
        });

        if (!statusRes.ok) {
          continue;
        }

        const jobStatus = (await statusRes.json()) as { Status?: string; status?: string };
        const currentStatus = (jobStatus.Status || jobStatus.status || "").toLowerCase();

        if (currentStatus === "ok" || currentStatus === "completed") {
          jobFinished = true;
          break;
        }

        if (currentStatus === "failed") {
          throw new Error("Google Maps scraping job failed on the scraper service.");
        }
      } catch (err: any) {
        if (err.message?.includes("failed on the scraper service")) {
          throw err;
        }
        // Transient network error while polling, retry next tick
      }
    }

    if (!jobFinished) {
      throw new Error(
        `Google Maps scraping job timed out after ${maxPollTimeMs / 1000}s. Please try again with a narrower search query.`
      );
    }

    // 6. Download the CSV results
    let csvText = "";
    try {
      const downloadRes = await fetch(`${baseUrl}/api/v1/jobs/${jobId}/download`);
      if (!downloadRes.ok) {
        throw new Error(`Failed to download scraping results (HTTP ${downloadRes.status})`);
      }
      csvText = await downloadRes.text();
    } catch (err: any) {
      throw new Error(`Failed to retrieve scraper results: ${err.message}`);
    }

    // 7. Parse CSV using fast-csv
    const rows = await parseScraperCsv(csvText);
    logger.info({ count: rows.length, jobId }, "Retrieved parsed CSV records from scraper");

    // 8. Map scraper fields to RawLead interface
    const leads: RawLead[] = [];
    const seenRefs = new Set<string>();
    const defaultCountry = detectCountryCode(location);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const companyName = (row.title || "").trim();
      if (!companyName) continue;

      const website = (row.website || "").trim();
      if (requireWebsite && (!website || !website.startsWith("http"))) {
        continue;
      }

      // Unique reference ID (real Google CID, data_id, link, or place_id)
      const realCid = extractCid(row);
      const ref = realCid || (row.link || row.place_id || `gmap_${i + 1}`).trim();
      if (seenRefs.has(ref)) continue;
      seenRefs.add(ref);

      // Normalize phone using existing normalizePhone helper
      const phoneNorm = row.phone ? normalizePhone(row.phone, defaultCountry) : undefined;
      const phoneRaw = row.phone ? row.phone.trim() : undefined;
      const phoneE164 = phoneNorm?.e164 || phoneRaw;

      // Extract rating and review count
      const rating = row.review_rating ? parseFloat(row.review_rating) : undefined;
      const reviewsCount = row.review_count ? parseInt(row.review_count, 10) : undefined;

      // Coordinates
      const latitude = row.latitude ? parseFloat(row.latitude) : undefined;
      const longitude = row.longitude ? parseFloat(row.longitude) : undefined;

      // First email if available directly from scraper
      const email = row.emails ? row.emails.split(",")[0]?.trim() : undefined;

      leads.push({
        sourceRef: ref,
        companyName,
        website: website || undefined,
        phoneRaw,
        phoneE164,
        email: email || undefined,
        address: row.address?.trim() || location,
        city: location,
        businessType: row.category?.trim() || keyword,
        rating: isNaN(rating as number) ? undefined : rating,
        reviewsCount: isNaN(reviewsCount as number) ? undefined : reviewsCount,
        latitude: isNaN(latitude as number) ? undefined : latitude,
        longitude: isNaN(longitude as number) ? undefined : longitude,
      });

      if (leads.length >= targetCount) {
        break;
      }
    }

    return leads;
  }
}

export const googleMapsProvider = new GoogleMapsProvider();
