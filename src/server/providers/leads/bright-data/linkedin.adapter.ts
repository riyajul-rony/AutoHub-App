import { brightDataClient } from "./client";
import { DEFAULT_LINKEDIN_DATASET_ID } from "./types";
import type { LeadScrapeSourceAdapter, BrightDataLinkedInRawRecord } from "./types";
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

export class BrightDataLinkedInAdapter implements LeadScrapeSourceAdapter {
  source = "linkedin" as const;
  datasetId = process.env.BRIGHT_DATA_DATASET_LINKEDIN || DEFAULT_LINKEDIN_DATASET_ID;

  async search(
    params: LeadSearchParams,
    apiKey: string,
    baseUrl?: string
  ): Promise<RawLead[]> {
    const { keyword, location, maxResults = 15, onlyWithWebsite } = params;
    const countryCode = detectCountry(location);

    const input = [
      {
        query: keyword.trim(),
        location: location.trim(),
        country: countryCode,
        limit: Math.min(Math.max(Number(maxResults) || 15, 1), 500),
      },
    ];

    const records = await brightDataClient.executeDatasetQuery<BrightDataLinkedInRawRecord>({
      datasetId: this.datasetId,
      input,
      apiKey,
      baseUrl,
    });

    const leads: RawLead[] = [];

    for (const record of records) {
      const name = (
        record.company_name ||
        record.name ||
        record.title ||
        ""
      ).trim();

      if (!name) continue;

      const website = (
        record.website ||
        record.company_url ||
        record.website_url ||
        ""
      ).trim() || undefined;

      if (onlyWithWebsite && (!website || !website.startsWith("http"))) {
        continue;
      }

      const rawPhone = (record.phone || record.phone_number || "").trim();
      const phoneNorm = rawPhone ? normalizePhone(rawPhone, countryCode) : undefined;
      const email = record.email || record.emails?.[0];

      leads.push({
        sourceRef: record.linkedin_id || record.company_id || record.id || `li_${Math.random().toString(36).slice(2, 10)}`,
        companyName: name,
        website,
        phoneRaw: rawPhone || undefined,
        phoneE164: phoneNorm?.e164,
        email: email || undefined,
        address: record.headquarters || record.address || record.location || location,
        city: record.city || location,
        country: record.country || countryCode,
        businessType: record.industry || record.company_type || record.category || keyword,
        rating: undefined,
        reviewsCount: undefined,
        linkedinUrl: formatSocialUrl(record.url || record.linkedin_url || record.profile_url, "linkedin"),
      });

      if (leads.length >= maxResults) {
        break;
      }
    }

    return leads;
  }
}

export const brightDataLinkedInAdapter = new BrightDataLinkedInAdapter();
