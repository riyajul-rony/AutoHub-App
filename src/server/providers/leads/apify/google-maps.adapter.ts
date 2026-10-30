import type { RawLead } from "../types";
import { logger } from "@/server/logger";
import {
  searchGoogleMapsKaix,
  type GoogleMapsRunParam,
  type GoogleMapsSearchOptions,
  type GoogleMapsLineResult,
} from "./adapters/kaix-gmaps.adapter";

export type { GoogleMapsRunParam, GoogleMapsSearchOptions, GoogleMapsLineResult };

export interface ExtendedGoogleMapsSearchOptions extends GoogleMapsSearchOptions {
  provider?: "kaix";
}

/**
 * Universal dispatcher for Google Maps leads scraping via Apify.
 * Uses the high-efficiency kaix/google-maps-places-scraper with Key Pool routing.
 */
export async function searchGoogleMapsApify(
  options: ExtendedGoogleMapsSearchOptions
): Promise<{
  allLeads: RawLead[];
  lineResults: GoogleMapsLineResult[];
}> {
  logger.info(
    { provider: "kaix", linesCount: options.lines.length },
    "[Google Maps Adapter] Dispatching search to Apify · kaix provider"
  );

  return searchGoogleMapsKaix(options);
}
