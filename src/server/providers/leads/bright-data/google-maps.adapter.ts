import { brightDataClient } from "./client";
import { DEFAULT_GMAPS_DATASET_ID } from "./types";
import type { LeadScrapeSourceAdapter, BrightDataGmapsRawRecord } from "./types";
import type { RawLead, LeadSearchParams } from "../types";
import { normalizePhone, formatSocialUrl } from "../enrichment";

function detectCountry(locationStr?: string): any {
  if (!locationStr) return "US";
  const l = locationStr.toLowerCase();
  if (/\b(us|usa|united states|new york|california|texas|florida|chicago|los angeles|miami)\b/i.test(l)) return "US";
  if (/\b(uk|united kingdom|england|great britain|london|manchester|birmingham)\b/i.test(l)) return "GB";
  if (/\b(bd|bangladesh|dhaka|chittagong|sylhet|rajshahi|khulna)\b/i.test(l)) return "BD";
  if (/\b(ca|canada|toronto|vancouver|montreal|calgary)\b/i.test(l)) return "CA";
  if (/\b(au|australia|sydney|melbourne|brisbane)\b/i.test(l)) return "AU";
  if (/\b(de|germany|berlin|munich|hamburg)\b/i.test(l)) return "DE";
  if (/\b(fr|france|paris|marseille|lyon)\b/i.test(l)) return "FR";
  return "US";
}

export class BrightDataGoogleMapsAdapter implements LeadScrapeSourceAdapter {
  source = "google_maps" as const;
  datasetId = process.env.BRIGHT_DATA_DATASET_GMAPS || DEFAULT_GMAPS_DATASET_ID;

  async search(
    params: LeadSearchParams,
    apiKey: string,
    baseUrl?: string
  ): Promise<RawLead[]> {
    const { keyword, location, maxResults = 15, onlyWithWebsite } = params;
    const countryCode = detectCountry(location);

    const input = [
      {
        query: `${keyword} in ${location}`.trim(),
        keyword: keyword.trim(),
        location: location.trim(),
        limit: Math.min(Math.max(Number(maxResults) || 15, 1), 500),
        country: countryCode,
      },
    ];

    const records = await brightDataClient.executeDatasetQuery<BrightDataGmapsRawRecord>({
      datasetId: this.datasetId,
      input,
      apiKey,
      baseUrl,
    });

    const leads: RawLead[] = [];

    for (const record of records) {
      const name = (
        record.name ||
        record.title ||
        record.company_name ||
        record.business_name ||
        ""
      ).trim();

      if (!name) continue;

      const website = (record.website || record.link || record.url || "").trim() || undefined;

      // Filter if onlyWithWebsite requested
      if (onlyWithWebsite && (!website || !website.startsWith("http"))) {
        continue;
      }

      const rawPhone = (
        record.phone ||
        record.phone_number ||
        record.phone_raw ||
        record.formatted_phone_number ||
        ""
      ).trim();

      const phoneNorm = rawPhone ? normalizePhone(rawPhone, countryCode) : undefined;

      const ratingVal =
        typeof record.rating === "number"
          ? record.rating
          : parseFloat(String(record.rating || record.review_rating || record.stars || ""));

      const reviewsVal =
        typeof record.reviews_count === "number"
          ? record.reviews_count
          : parseInt(String(record.reviews_count || record.review_count || record.reviews || ""));

      const email = record.email || record.emails?.[0];

      const lat = record.latitude ? parseFloat(String(record.latitude)) : undefined;
      const lng = record.longitude ? parseFloat(String(record.longitude)) : undefined;

      leads.push({
        sourceRef: record.place_id || record.cid || record.data_id || record.id || `gmaps_${Math.random().toString(36).slice(2, 10)}`,
        companyName: name,
        website,
        phoneRaw: rawPhone || undefined,
        phoneE164: phoneNorm?.e164,
        email: email || undefined,
        address: record.address || record.formatted_address || record.street_address || `${location}`,
        city: record.city || location,
        country: record.country || record.country_code || countryCode,
        businessType: record.category || record.category_name || record.business_type || record.type || keyword,
        rating: isNaN(ratingVal) ? undefined : ratingVal,
        reviewsCount: isNaN(reviewsVal) ? undefined : reviewsVal,
        latitude: isNaN(lat!) ? undefined : lat,
        longitude: isNaN(lng!) ? undefined : lng,
        facebookUrl: formatSocialUrl(record.facebook || record.facebook_url, "facebook"),
        instagramUrl: formatSocialUrl(record.instagram || record.instagram_url, "instagram"),
        linkedinUrl: formatSocialUrl(record.linkedin || record.linkedin_url, "linkedin"),
      });

      if (leads.length >= maxResults) {
        break;
      }
    }

    return leads;
  }
}

export const brightDataGoogleMapsAdapter = new BrightDataGoogleMapsAdapter();
