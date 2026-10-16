import { brightDataClient } from "./client";
import { DEFAULT_META_DATASET_ID } from "./types";
import type { LeadScrapeSourceAdapter, BrightDataMetaRawRecord } from "./types";
import type { RawLead, LeadSearchParams } from "../types";
import { normalizePhone, formatSocialUrl } from "../enrichment";

function detectCountry(locationStr?: string): any {
  if (!locationStr) return "US";
  const l = locationStr.toLowerCase();
  if (/\b(us|usa|united states|new york|california|texas|florida)\b/i.test(l)) return "US";
  if (/\b(uk|united kingdom|england|london)\b/i.test(l)) return "GB";
  if (/\b(bd|bangladesh|dhaka)\b/i.test(l)) return "BD";
  if (/\b(ca|canada|toronto)\b/i.test(l)) return "CA";
  if (/\b(au|australia|sydney)\b/i.test(l)) return "AU";
  return "US";
}

export class BrightDataMetaAdsAdapter implements LeadScrapeSourceAdapter {
  source = "meta_ads" as const;
  datasetId = process.env.BRIGHT_DATA_DATASET_META || DEFAULT_META_DATASET_ID;

  async search(
    params: LeadSearchParams,
    apiKey: string,
    baseUrl?: string
  ): Promise<RawLead[]> {
    const { keyword, location, maxResults = 15, onlyWithWebsite } = params;
    const countryCode = detectCountry(location);

    const input = [
      {
        search_term: keyword.trim(),
        query: keyword.trim(),
        country: countryCode,
        location: location.trim(),
        limit: Math.min(Math.max(Number(maxResults) || 15, 1), 500),
      },
    ];

    const records = await brightDataClient.executeDatasetQuery<BrightDataMetaRawRecord>({
      datasetId: this.datasetId,
      input,
      apiKey,
      baseUrl,
    });

    const leads: RawLead[] = [];

    for (const record of records) {
      const name = (
        record.page_name ||
        record.advertiser_name ||
        record.company_name ||
        record.title ||
        ""
      ).trim();

      if (!name) continue;

      const website = (
        record.link_url ||
        record.website ||
        record.destination_url ||
        record.landing_page ||
        ""
      ).trim() || undefined;

      if (onlyWithWebsite && (!website || !website.startsWith("http"))) {
        continue;
      }

      const rawPhone = (record.phone || record.phone_number || "").trim();
      const phoneNorm = rawPhone ? normalizePhone(rawPhone, countryCode) : undefined;
      const email = record.email || record.emails?.[0];

      leads.push({
        sourceRef: record.ad_id || record.page_id || record.id || `meta_${Math.random().toString(36).slice(2, 10)}`,
        companyName: name,
        website,
        phoneRaw: rawPhone || undefined,
        phoneE164: phoneNorm?.e164,
        email: email || undefined,
        address: record.address || record.page_location || record.location || location,
        city: record.city || location,
        country: record.country || countryCode,
        businessType: record.category || record.page_category || "Meta Advertiser",
        rating: undefined,
        reviewsCount: undefined,
        facebookUrl: formatSocialUrl(record.page_profile_uri || record.facebook_page || record.page_url, "facebook"),
        instagramUrl: formatSocialUrl(record.instagram_url || record.instagram_handle, "instagram"),
        linkedinUrl: formatSocialUrl(record.linkedin_url, "linkedin"),
      });

      if (leads.length >= maxResults) {
        break;
      }
    }

    return leads;
  }
}

export const brightDataMetaAdsAdapter = new BrightDataMetaAdsAdapter();
