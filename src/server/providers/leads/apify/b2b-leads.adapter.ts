import { startActorRun, getActorRun, fetchDatasetItems, logApifyUsage } from "./client";
import { getApifySettings } from "./config";
import { withApifyKeyPool } from "./pool-service";
import type { RawLead } from "../types";
import { logger } from "@/server/logger";

export const DEFAULT_B2B_ACTOR_ID =
  "disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads";

export interface B2BLeadsSearchOptions {
  jobTitles?: string[];
  seniority?: string[];
  industry?: string;
  keywords?: string;
  companyDescriptions?: string[];
  location?: string;
  country?: string;
  state?: string;
  city?: string;
  companySize?: string;
  maxLeads: number;
  requireEmail?: boolean;
  requirePhone?: boolean;
  userId: string;
  onProgress?: (status: string, count: number) => void;
}

export interface B2BLeadRecord {
  name?: string;
  jobTitle?: string;
  companyName: string;
  companyDomain?: string;
  email?: string;
  emailStatus?: string;
  phone?: string;
  linkedinUrl?: string;
  companyLinkedinUrl?: string;
  location?: string;
  industry?: string;
  companySize?: string;
}

export const US_STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

export const ALLOWED_US_STATES = new Set(Object.values(US_STATE_NAME_TO_CODE));

export const US_STATE_CODE_TO_NAME: Record<string, string> = Object.entries(
  US_STATE_NAME_TO_CODE
).reduce((acc, [name, code]) => {
  acc[code] = name;
  return acc;
}, {} as Record<string, string>);

export const AGENTICDATA_ALLOWED_SENIORITY = [
  "founder",
  "owner",
  "c_suite",
  "director",
  "partner",
  "vp",
  "manager",
  "senior",
  "entry",
] as const;

export const AGENTICDATA_ALLOWED_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
] as const;

/**
 * Maps user-selected seniority levels to AgenticData allowed enum values.
 */
export function mapAgenticDataSeniority(seniority?: string[]): string[] | undefined {
  if (!seniority || seniority.length === 0) return undefined;
  const map: Record<string, string[]> = {
    founder: ["founder"],
    owner: ["owner"],
    cxo: ["c_suite", "founder"],
    "founder/cxo": ["founder", "c_suite"],
    c_level: ["c_suite"],
    c_suite: ["c_suite"],
    director: ["director"],
    partner: ["partner"],
    vp: ["vp"],
    head: ["director", "vp"],
    manager: ["manager"],
    staff: ["senior"],
    senior: ["senior"],
    entry: ["entry"],
    trainee: ["entry"],
  };

  const result: string[] = [];
  for (const s of seniority) {
    if (!s) continue;
    const clean = s.toLowerCase().trim();
    const mapped = map[clean] || (AGENTICDATA_ALLOWED_SENIORITY.includes(clean as any) ? [clean] : undefined);
    if (mapped) result.push(...mapped);
  }

  const unique = Array.from(new Set(result));
  return unique.length > 0 ? unique : undefined;
}

/**
 * Maps free-form company size strings to AgenticData headcount bands.
 */
export function mapAgenticDataCompanySize(size?: string | string[]): string[] | undefined {
  if (!size) return undefined;
  const sizes = Array.isArray(size) ? size : [size];
  const result: string[] = [];

  for (const s of sizes) {
    if (!s) continue;
    const clean = s.toLowerCase().trim();
    if (clean === "all" || clean === "any") continue;

    if (clean === "1-10" || clean === "1 to 10" || clean === "seed") {
      result.push("1-10");
    } else if (clean === "11-20" || clean === "11-25" || clean === "11 to 25" || clean === "11-50" || clean === "small") {
      result.push("11-50");
    } else if (clean === "21-50" || clean === "26-50" || clean === "26 to 50") {
      result.push("11-50");
    } else if (clean === "51-100" || clean === "51 to 100" || clean === "51-200" || clean === "medium") {
      result.push("51-200");
    } else if (clean === "101-200" || clean === "101-250" || clean === "101 to 250") {
      result.push("51-200");
    } else if (clean === "201-500" || clean === "251 to 500" || clean === "251-500" || clean === "mid-market") {
      result.push("201-500");
    } else if (clean === "501-1000" || clean === "501 to 1000") {
      result.push("501-1000");
    } else if (clean === "1000+") {
      result.push("1001-5000", "10001+");
    } else if (clean === "1001-5000" || clean === "1001-2000" || clean === "2001-5000") {
      result.push("1001-5000");
    } else if (clean === "5001-10000" || clean === "5000+") {
      result.push("5001-10000");
    } else if (clean === "10000+" || clean === "10001+") {
      result.push("10001+");
    } else if (AGENTICDATA_ALLOWED_SIZES.includes(clean as any)) {
      result.push(clean);
    }
  }

  const unique = Array.from(new Set(result));
  return unique.length > 0 ? unique : undefined;
}

/**
 * Normalizes user state input (e.g. "New York", "NY", "Texas", "TX") into a 2-letter state code.
 */
export function normalizeStateCode(input?: string): string | undefined {
  if (!input) return undefined;
  const clean = input.trim().toLowerCase();
  if (ALLOWED_US_STATES.has(clean.toUpperCase())) {
    return clean.toUpperCase();
  }
  return US_STATE_NAME_TO_CODE[clean];
}

/**
 * Filters or prioritizes leads by requested country/state/city.
 */
export function filterOrPrioritizeByLocation(
  items: any[],
  criteria?: { country?: string; state?: string; city?: string }
): { items: any[]; filteredOutCount: number } {
  if (!items || items.length === 0 || !criteria) {
    return { items: items || [], filteredOutCount: 0 };
  }

  const reqCountry = criteria.country?.trim().toLowerCase();
  const reqStateCode = criteria.state ? normalizeStateCode(criteria.state) : undefined;
  const reqStateName = reqStateCode ? US_STATE_CODE_TO_NAME[reqStateCode]?.toLowerCase() : undefined;
  const reqCity = criteria.city?.trim().toLowerCase();

  if (!reqCountry && !reqStateCode && !reqCity) {
    return { items, filteredOutCount: 0 };
  }

  const strongMatches: any[] = [];
  const neutralMatches: any[] = [];
  let filteredOutCount = 0;

  for (const item of items) {
    if (!item) continue;
    const itemCountry = String(item.country || item.company_country || "").toLowerCase().trim();
    const itemState = String(item.state || item.company_state || "").toLowerCase().trim();
    const itemCity = String(item.city || item.company_city || "").toLowerCase().trim();

    // Country conflict filter
    if (
      reqCountry === "us" &&
      itemCountry &&
      itemCountry !== "us" &&
      itemCountry !== "united states" &&
      itemCountry !== "usa"
    ) {
      filteredOutCount++;
      continue;
    }

    const hasStateRequirement = Boolean(reqStateCode);
    const stateMatches =
      reqStateCode &&
      (itemState === reqStateCode.toLowerCase() ||
        itemState.includes(reqStateCode.toLowerCase()) ||
        (reqStateName && itemState.includes(reqStateName)));

    const hasCityRequirement = Boolean(reqCity);
    const cityMatches = reqCity && itemCity.includes(reqCity);

    if (
      (hasStateRequirement && stateMatches) ||
      (hasCityRequirement && cityMatches) ||
      (!hasStateRequirement && !hasCityRequirement)
    ) {
      strongMatches.push(item);
    } else {
      neutralMatches.push(item);
    }
  }

  const combined = strongMatches.length > 0 ? [...strongMatches, ...neutralMatches] : items;
  return { items: combined, filteredOutCount };
}

/**
 * Converts raw Apify schema validation errors into human-readable messages.
 */
export function formatB2BApifyError(err: any): string {
  const raw = err?.message || String(err);
  if (raw.includes("rate limit") || raw.includes("429")) {
    return "Apify rate limit reached. AutoHub will automatically rotate keys or retry.";
  }
  if (raw.includes("credit") || raw.includes("usage limit") || raw.includes("Monthly usage limit")) {
    return "Apify মাসিক ক্রেডিট সীমা শেষ হয়ে গেছে। অনুগ্রহ করে অ্যাডমিন প্যানেল থেকে নতুন Apify কী যোগ করুন।";
  }
  return raw;
}

/**
 * Builds the actor input object strictly conforming to AgenticData OpenAPI schema:
 * disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads
 */
export function buildActorInput(
  options: B2BLeadsSearchOptions,
  _actorId = DEFAULT_B2B_ACTOR_ID
): Record<string, any> {
  const maxResults = Math.max(1, options.maxLeads || 25);
  const country = options.country?.trim() || "US";
  const rawLoc = options.location?.trim();

  let detectedState = options.state ? normalizeStateCode(options.state) : undefined;
  let detectedCity = options.city?.trim() || undefined;

  if (!detectedState && rawLoc) {
    const parts = rawLoc.split(",").map((p) => p.trim());
    for (const part of parts) {
      const stateCode = normalizeStateCode(part);
      if (stateCode) {
        detectedState = stateCode;
        break;
      }
    }
    const firstPart = parts[0];
    const isCountry = Boolean(
      firstPart &&
        (firstPart.toUpperCase() === "US" ||
          firstPart.toUpperCase() === "USA" ||
          firstPart.toLowerCase() === "united states" ||
          firstPart.toUpperCase() === "UK" ||
          firstPart.toUpperCase() === "GB" ||
          firstPart.toUpperCase() === "CA" ||
          firstPart.toUpperCase() === "AU" ||
          firstPart.toLowerCase() === country.toLowerCase())
    );
    if (!detectedCity && firstPart && !normalizeStateCode(firstPart) && !isCountry) {
      detectedCity = firstPart;
    }
  }

  const titles = Array.isArray(options.jobTitles)
    ? options.jobTitles.filter((t) => typeof t === "string" && t.trim().length > 0)
    : [];

  const keywords = options.companyDescriptions && options.companyDescriptions.length > 0
    ? options.companyDescriptions.filter((d) => typeof d === "string" && d.trim().length > 0)
    : options.keywords?.trim()
    ? [options.keywords.trim()]
    : undefined;

  const countries: string[] = [];
  if (country === "US") countries.push("United States");
  else if (country === "UK" || country === "GB") countries.push("United Kingdom");
  else if (country === "CA") countries.push("Canada");
  else if (country === "AU") countries.push("Australia");
  else if (country) countries.push(country);

  const states: string[] = [];
  if (detectedState) {
    const fullName = US_STATE_CODE_TO_NAME[detectedState];
    if (fullName) {
      states.push(fullName.charAt(0).toUpperCase() + fullName.slice(1));
    } else {
      states.push(detectedState);
    }
  }

  const cities: string[] = detectedCity ? [detectedCity] : [];

  const seniority = mapAgenticDataSeniority(options.seniority);
  const companySize = mapAgenticDataCompanySize(options.companySize);
  const industries = options.industry?.trim() ? [options.industry.trim().toLowerCase()] : undefined;

  const input: Record<string, any> = {
    maxResults,
    similarTitles: true,
    includeEmails: options.requireEmail !== false,
    includePhones: Boolean(options.requirePhone),
    emailStatus: options.requireEmail !== false ? "verified" : "all",
  };

  if (titles.length > 0) input.jobTitles = titles;
  if (seniority && seniority.length > 0) input.seniority = seniority;
  if (countries.length > 0) input.personCountry = countries;
  if (states.length > 0) input.personState = states;
  if (cities.length > 0) input.personCity = cities;
  if (industries && industries.length > 0) input.companyIndustry = industries;
  if (keywords && keywords.length > 0) input.industryKeywords = keywords;
  if (companySize && companySize.length > 0) input.companySize = companySize;

  return input;
}

export interface GroupedCompanyLead {
  companyName: string;
  companyDomain?: string;
  website?: string;
  city?: string;
  state?: string;
  country?: string;
  industry?: string;
  companySize?: string;
  companyLinkedinUrl?: string;
  decision_makers: Array<{
    name: string;
    title: string;
    email?: string;
    emailStatus?: string;
    phone?: string;
    profileUrl?: string;
    isVerifiedRole: boolean;
  }>;
  decisionMakers?: Array<{
    name: string;
    title: string;
    email?: string;
    emailStatus?: string;
    phone?: string;
    profileUrl?: string;
    isVerifiedRole: boolean;
  }>;
}

/**
 * Groups flat person lead records by company domain or company name,
 * building rich company intelligence with an array of verified decision makers.
 */
export function groupPersonLeadsByCompany(
  rawItems: any[],
  fallback?: { rawLoc?: string; country?: string; detectedCity?: string; detectedState?: string; industry?: string; companySize?: string }
): GroupedCompanyLead[] {
  const groupedMap = new Map<string, GroupedCompanyLead>();

  for (const item of rawItems) {
    if (!item) continue;

    const companyName = String(
      item.company || item.company_name || item.companyName || item.company_name_for_emails || ""
    ).trim();
    if (!companyName) continue;

    const fullName = String(
      item.full_name ||
      item.fullName ||
      item.name ||
      [item.first_name || item.firstName, item.last_name || item.lastName].filter(Boolean).join(" ") ||
      ""
    ).trim();

    const title = String(item.title || item.job_title || item.jobTitle || item.headline || "").trim();
    const domain = item.website || item.company_domain || item.companyDomain || item.company_website || undefined;
    const email = item.email || item.personal_email || item.businessEmail || undefined;
    const phone = item.mobile_phone || item.work_direct_phone || item.corporate_phone || item.phone || item.mobile_number || item.company_phone || undefined;
    const linkedin = item.person_linkedin_url || item.linkedin || item.linkedinUrl || item.profileUrl || undefined;
    const companyLinkedin = item.company_linkedin_url || item.company_linkedin || item.companyLinkedinUrl || undefined;

    const groupKey = domain ? domain.toLowerCase().replace(/^www\./, "").replace(/^https?:\/\//, "").replace(/\/.*$/, "") : companyName.toLowerCase();

    const dmRecord = {
      name: fullName,
      title: title || "Decision Maker",
      email,
      emailStatus: item.email_status || item.emailStatus || (email ? "valid" : undefined),
      phone,
      profileUrl: linkedin ? (linkedin.startsWith("http") ? linkedin : `https://${linkedin}`) : undefined,
      isVerifiedRole: true,
    };

    if (!groupedMap.has(groupKey)) {
      const dms = fullName ? [dmRecord] : [];
      let formattedWebsite = domain;
      if (formattedWebsite && !formattedWebsite.startsWith("http")) {
        formattedWebsite = `https://${formattedWebsite}`;
      }

      groupedMap.set(groupKey, {
        companyName,
        companyDomain: domain,
        website: formattedWebsite,
        city: item.company_city || item.city || fallback?.detectedCity || undefined,
        state: item.company_state || item.state || fallback?.detectedState || undefined,
        country: item.company_country || item.country || fallback?.country || "US",
        industry: item.industry || item.company_industry || fallback?.industry || undefined,
        companySize: item.employees || item.company_size || item.size || item.employeeCount || fallback?.companySize || undefined,
        companyLinkedinUrl: companyLinkedin ? (companyLinkedin.startsWith("http") ? companyLinkedin : `https://${companyLinkedin}`) : undefined,
        decision_makers: dms,
        decisionMakers: dms,
      });
    } else {
      const existing = groupedMap.get(groupKey)!;
      if (fullName && !existing.decision_makers.some((dm) => dm.name.toLowerCase() === fullName.toLowerCase())) {
        existing.decision_makers.push(dmRecord);
        if (existing.decisionMakers && !existing.decisionMakers.includes(dmRecord)) {
          existing.decisionMakers.push(dmRecord);
        }
      }
    }
  }

  return Array.from(groupedMap.values());
}

/**
 * Searches B2B Leads using the configured AgenticData Apollo/ZoomInfo Replacement actor.
 * Fully integrated with Apify key pool routing, schema normalization, and company grouping.
 */
export async function searchB2BLeadsApify(
  options: B2BLeadsSearchOptions
): Promise<{
  allLeads: RawLead[];
  b2bRecords: B2BLeadRecord[];
  runId: string;
  totalCostUsd?: number;
}> {
  const settings = await getApifySettings();
  const actorId = settings.actors.b2b_leads || DEFAULT_B2B_ACTOR_ID;
  const unitPrice = settings.unitPrices.b2b_leads ?? 0.0005;

  return withApifyKeyPool("b2b_leads_search", async ({ client, keyId }) => {
    const maxLeads = Math.max(1, options.maxLeads || 25);
    const actorInput = buildActorInput(options, actorId);

    logger.info(
      {
        actorId,
        keyId,
        maxLeads,
        jobTitles: options.jobTitles,
        seniority: options.seniority,
        industry: options.industry,
        keywords: options.keywords,
        location: options.location,
        country: options.country,
        state: options.state,
        city: options.city,
        requireEmail: options.requireEmail,
        requirePhone: options.requirePhone,
        builtInput: actorInput,
      },
      "[B2B Leads] Starting Apify AgenticData actor run"
    );

    options.onProgress?.("Starting B2B database search...", 10);

    const run = await startActorRun(actorId, actorInput, {
      client,
      memoryMbytes: 512,
      timeoutSecs: 300,
    });

    logger.info({ actorId, keyId, runId: run.id }, "[B2B Leads] Actor run initiated");

    // Poll for run completion
    let currentRun = await getActorRun(run.id, client);
    let attempts = 0;
    const maxAttempts = 120; // up to 4 minutes

    while (
      currentRun.status === "RUNNING" ||
      currentRun.status === "READY"
    ) {
      attempts++;
      if (attempts > maxAttempts) {
        throw new Error(
          `B2B Leads scraper timed out after ${maxAttempts * 2} seconds. The Apify actor is still running. Please check back later.`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
      currentRun = await getActorRun(run.id, client);
      options.onProgress?.("Extracting verified decision makers...", Math.min(10 + attempts * 2, 85));
    }

    logger.info(
      {
        actorId,
        keyId,
        runId: run.id,
        runStatus: currentRun.status,
        statusMessage: currentRun.statusMessage,
        attempts,
      },
      "[B2B Leads] Run polling completed"
    );

    if (currentRun.status !== "SUCCEEDED") {
      if (currentRun.status === "TIMED-OUT") {
        throw new Error(
          "B2B Leads scraper timed out. Try requesting fewer leads or refining your search filters."
        );
      }
      throw new Error(
        currentRun.statusMessage || `B2B Leads actor run ended with status: ${currentRun.status}`
      );
    }

    options.onProgress?.("Fetching verified decision-maker records...", 0);

    // Fetch raw dataset items
    const datasetResult = await fetchDatasetItems<any>(currentRun.defaultDatasetId, {
      limit: Math.max(maxLeads * 2, 50),
      client,
    });

    // Filter out empty rows or diagnostic notices
    const validDatasetItems = datasetResult.filter((item) => {
      if (!item || item.error || item.rowType === "diagnostic") return false;
      const comp = String(item.company || item.company_name || item.companyName || "").trim();
      const name = String(item.full_name || item.fullName || item.name || item.first_name || "").trim();
      return comp.length > 0 || name.length > 0;
    });

    // Location post-filtering
    const { items: filteredItems, filteredOutCount } = filterOrPrioritizeByLocation(validDatasetItems, {
      country: options.country || "US",
      state: options.state,
      city: options.city,
    });

    if (filteredOutCount > 0) {
      logger.info(
        { filteredOutCount, remaining: filteredItems.length },
        "[B2B Leads] Filtered out cross-border location mismatches"
      );
    }

    // Server-side strict slicing to requested maxLeads
    const rawItems = filteredItems.slice(0, maxLeads);

    const b2bRecords: B2BLeadRecord[] = rawItems
      .filter(Boolean)
      .map((item) => {
        const companyName = String(item.company || item.company_name || item.companyName || "").trim();
        const fullName = String(
          item.full_name ||
          item.fullName ||
          item.name ||
          [item.first_name || item.firstName, item.last_name || item.lastName].filter(Boolean).join(" ") ||
          ""
        ).trim();
        const title = String(item.title || item.job_title || item.jobTitle || item.headline || "").trim();
        const domain = item.website || item.company_domain || item.companyDomain || undefined;
        const email = item.email || item.personal_email || item.businessEmail || undefined;
        const phone = item.mobile_phone || item.work_direct_phone || item.corporate_phone || item.phone || item.mobile_number || undefined;
        const linkedin = item.person_linkedin_url || item.linkedin || item.linkedinUrl || undefined;
        const companyLinkedin = item.company_linkedin_url || item.company_linkedin || undefined;
        const loc = [item.city, item.state, item.country].filter(Boolean).join(", ") || options.location || "US";

        return {
          name: fullName || undefined,
          jobTitle: title || undefined,
          companyName,
          companyDomain: domain,
          email,
          emailStatus: item.email_status || (email ? "valid" : undefined),
          phone,
          linkedinUrl: linkedin ? (linkedin.startsWith("http") ? linkedin : `https://${linkedin}`) : undefined,
          companyLinkedinUrl: companyLinkedin ? (companyLinkedin.startsWith("http") ? companyLinkedin : `https://${companyLinkedin}`) : undefined,
          location: loc,
          industry: item.industry || item.company_industry || options.industry || undefined,
          companySize: item.employees || item.company_size || options.companySize || undefined,
        };
      });

    const groupedCompanies = groupPersonLeadsByCompany(rawItems, {
      country: options.country || "US",
      industry: options.industry,
      companySize: options.companySize,
    });

    const leads: RawLead[] = groupedCompanies.map((comp) => {
      const primaryDm = comp.decision_makers[0];
      return {
        sourceRef: primaryDm?.profileUrl || comp.companyDomain || `b2b_${Math.random().toString(36).slice(2, 9)}`,
        companyName: comp.companyName,
        website: comp.website,
        email: primaryDm?.email,
        phoneRaw: primaryDm?.phone,
        phoneE164: primaryDm?.phone,
        city: comp.city,
        country: comp.country,
        businessType: comp.industry || "B2B",
        linkedinUrl: comp.companyLinkedinUrl || primaryDm?.profileUrl,
        extra: {
          founder_name: primaryDm?.name,
          job_title: primaryDm?.title,
          founder_email: primaryDm?.email,
          founder_phones: primaryDm?.phone ? [primaryDm.phone] : [],
          founder_socials: primaryDm?.profileUrl ? [primaryDm.profileUrl] : [],
          company_size: comp.companySize,
          industry: comp.industry,
          email_status: primaryDm?.emailStatus || (primaryDm?.email ? "valid" : undefined),
          linkedin_profile_url: primaryDm?.profileUrl,
          company_linkedin_url: comp.companyLinkedinUrl,
          decision_makers: comp.decision_makers,
          total_decision_makers: comp.decision_makers.length,
          provider: "Apify · AgenticData (Apollo & ZoomInfo Replacement)",
          apifyKeyId: keyId,
        },
      };
    });

    logger.info(
      {
        actorId,
        keyId,
        runId: run.id,
        rawItemsCount: rawItems.length,
        groupedCompaniesCount: leads.length,
      },
      "[B2B Leads] Dataset parsed and grouped successfully"
    );

    // Log Apify usage
    const estCost = rawItems.length * unitPrice;
    const actualCost = currentRun.chargeUsd ?? currentRun.usageTotalUsd;
    await logApifyUsage({
      userId: options.userId,
      module: "b2b_leads",
      actorId,
      runId: run.id,
      itemCount: rawItems.length,
      estimatedCost: estCost,
      actualCost,
    });

    options.onProgress?.(`Retrieved ${leads.length} verified B2B companies with decision makers`, leads.length);

    return {
      allLeads: leads,
      b2bRecords,
      runId: run.id,
      totalCostUsd: actualCost ?? estCost,
    };
  });
}
