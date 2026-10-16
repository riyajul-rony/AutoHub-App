export * from "./types";
export * from "./client";
export * from "./google-maps.adapter";
export * from "./meta-ads.adapter";
export * from "./linkedin.adapter";

import { brightDataGoogleMapsAdapter } from "./google-maps.adapter";
import { brightDataMetaAdsAdapter } from "./meta-ads.adapter";
import { brightDataLinkedInAdapter } from "./linkedin.adapter";
import type { BrightDataLeadSource, LeadScrapeSourceAdapter } from "./types";

export function getBrightDataAdapter(source: BrightDataLeadSource): LeadScrapeSourceAdapter {
  switch (source) {
    case "google_maps":
      return brightDataGoogleMapsAdapter;
    case "meta_ads":
      return brightDataMetaAdsAdapter;
    case "linkedin":
      return brightDataLinkedInAdapter;
    default:
      return brightDataGoogleMapsAdapter;
  }
}
