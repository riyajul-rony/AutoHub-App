import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@/server/queues";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { isApifyConfigured, getApifySettings } from "@/server/providers/leads/apify/config";
import { searchGoogleMapsApify } from "@/server/providers/leads/apify/google-maps.adapter";
import { searchMetaAdsApify } from "@/server/providers/leads/apify/meta-ads.adapter";
import { searchB2BLeadsApify } from "@/server/providers/leads/apify/b2b-leads.adapter";
import { parseGoogleMapsLines } from "@/server/providers/leads/apify/line-parser";
import { filterDuplicateLeads } from "@/server/providers/leads/dedupe";
import { scrapeFullCompanyProfile, formatSocialUrl } from "@/server/providers/leads/enrichment";
import { trackUsageIncrement } from "@/server/billing/usage-tracker";
import type { RawLead } from "@/server/providers/leads/types";

/**
 * Checks whether user has requested cancellation of the active search
 */
async function isSearchCancelled(searchId: string): Promise<boolean> {
  const record = await db.lead_searches.findUnique({
    where: { id: searchId },
    select: { status: true },
  });
  return record?.status === "cancelled";
}

/**
 * Core search execution engine for Apify lead generation:
 * handles Google Maps, Meta Ads, and B2B Leads scraping,
 * deduplication, deep website enrichment, progress updates, and graceful cancellation.
 */
export async function executeLeadSearch(searchId: string): Promise<void> {
  const searchRecord = await db.lead_searches.findUnique({
    where: { id: searchId },
  });

  if (!searchRecord) {
    logger.warn({ searchId }, "Lead search record not found for execution");
    return;
  }

  if (searchRecord.status === "cancelled") {
    logger.info({ searchId }, "Search was cancelled prior to execution");
    return;
  }

  const userId = searchRecord.user_id;
  const source = searchRecord.source;
  const params: any =
    typeof searchRecord.params === "object" && searchRecord.params !== null
      ? searchRecord.params
      : {};

  const keyword = params.keyword || "";
  const location = params.location || "";
  const country = params.country || undefined;
  const state = params.state || undefined;
  const city = params.city || undefined;
  const industry = params.industry || undefined;
  const companyDescriptions = Array.isArray(params.company_descriptions)
    ? params.company_descriptions
    : Array.isArray(params.companyDescriptions)
    ? params.companyDescriptions
    : undefined;
  const adStatus = params.ad_status ?? params.adStatus ?? "active";
  const titles = Array.isArray(params.titles) ? params.titles : undefined;
  const seniority = Array.isArray(params.seniority) ? params.seniority : undefined;
  const companySize = params.company_size || params.companySize || undefined;
  const requireEmail = Boolean(params.require_email ?? params.requireEmail ?? false);
  const requirePhone = Boolean(params.require_phone ?? params.requirePhone ?? false);
  const findDecisionMakers = params.find_decision_makers ?? params.findDecisionMakers ?? true;
  const maxDecisionMakers = Number(params.max_decision_makers ?? params.maxDecisionMakers) || 3;
  const maxResults = Math.min(1000, Math.max(Number(params.max_results ?? params.maxResults) || 25, 1));
  const findEmails = source === "google_maps" ? Boolean(params.find_emails ?? params.findEmails ?? true) : false;

  try {
    // Step 1: Initialize (10%)
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        status: "running",
        progress_pct: 10,
        current_step: "Verifying lead search engine...",
        started_at: new Date(),
      },
    });

    const configured = await isApifyConfigured();
    if (!configured) {
      throw new Error(
        "Lead search provider temporarily unavailable, please try again in a moment."
      );
    }

    if (await isSearchCancelled(searchId)) return;

    // Step 2: Scrape Raw Leads (20% -> 50%)
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        progress_pct: 20,
        current_step: `Dispatching ${source} scraper query...`,
      },
    });

    let rawLeads: RawLead[] = [];

    if (source === "google_maps") {
      // Build lines from params: either array of lines or parsed from multi-line text
      let lines = Array.isArray(params.lines) ? params.lines : [];
      if (lines.length === 0) {
        const rawText = params.multi_line_input || (location ? `${keyword}, ${location}` : keyword);
        const parsed = parseGoogleMapsLines(rawText);
        lines = parsed.validLines;
      }

      if (lines.length === 0) {
        throw new Error("No valid search lines provided (format: 'niche, location').");
      }

      const res = await searchGoogleMapsApify({
        lines,
        maxLeadsPerLine: maxResults,
        userId,
        onLineProgress: (idx, statusTxt) => {
          db.lead_searches
            .update({
              where: { id: searchId },
              data: {
                current_step: `Line ${idx + 1}/${lines.length}: ${statusTxt}`,
                progress_pct: Math.min(20 + Math.floor(((idx + 1) / lines.length) * 30), 50),
              },
            })
            .catch(() => {});
        },
      });

      if (res.lineResults.length > 0 && res.lineResults.every((r) => !r.success)) {
        const firstError = res.lineResults[0]?.error || "Google Maps scraper execution failed";
        throw new Error(firstError);
      }

      rawLeads = res.allLeads;
    } else if (source === "meta_ads") {
      const res = await searchMetaAdsApify({
        keyword: keyword || params.q || "agency",
        country: country || "US",
        maxLeads: maxResults,
        activeOnly: adStatus === "active",
        userId,
        onProgress: (statusTxt) => {
          db.lead_searches
            .update({
              where: { id: searchId },
              data: {
                current_step: statusTxt,
                progress_pct: 35,
              },
            })
            .catch(() => {});
        },
      });

      rawLeads = res.allLeads;
    } else if (source === "linkedin") {
      const res = await searchB2BLeadsApify({
        jobTitles: titles,
        seniority,
        industry,
        keywords: keyword || undefined,
        companyDescriptions: companyDescriptions || (keyword ? [keyword] : undefined),
        location: location || undefined,
        state,
        city,
        country: country || "US",
        companySize,
        maxLeads: maxResults,
        requireEmail,
        requirePhone,
        userId,
        onProgress: (statusTxt) => {
          db.lead_searches
            .update({
              where: { id: searchId },
              data: {
                current_step: statusTxt,
                progress_pct: 35,
              },
            })
            .catch(() => {});
        },
      });

      rawLeads = res.allLeads;
    } else {
      throw new Error(`Unsupported lead source: ${source}`);
    }

    if (await isSearchCancelled(searchId)) return;

    // Step 3: Deduplication (55%)
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        progress_pct: 55,
        current_step: `Discovered ${rawLeads.length} leads. Filtering duplicates...`,
        found_count: rawLeads.length,
      },
    });

    const existingLeads = await db.leads.findMany({
      where: { user_id: userId },
      select: { dedupe_key: true },
    });
    const existingKeys = new Set<string>(existingLeads.map((l: any) => l.dedupe_key).filter(Boolean));

    const { uniqueLeads, duplicateCount } = filterDuplicateLeads(userId, rawLeads, existingKeys);

    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        duplicates_skipped: duplicateCount,
      },
    });

    if (uniqueLeads.length === 0) {
      await db.lead_searches.update({
        where: { id: searchId },
        data: {
          status: "completed",
          progress_pct: 100,
          current_step: `Complete: 0 new unique leads found (${duplicateCount} duplicates skipped)`,
          finished_at: new Date(),
        },
      });
      return;
    }

    // Step 4: Deep Website Crawl & Contact Enrichment (Google Maps only when findEmails is enabled)
    const enrichedResults: Array<{ raw: any; profile: any; dedupeKey: string }> = [];

    if (source === "google_maps" && findEmails) {
      await db.lead_searches.update({
        where: { id: searchId },
        data: {
          status: "enriching",
          progress_pct: 60,
          current_step: `Enriching contact channels for ${uniqueLeads.length} unique businesses...`,
        },
      });

      const batchSize = 5;
      for (let i = 0; i < uniqueLeads.length; i += batchSize) {
        if (await isSearchCancelled(searchId)) {
          logger.info({ searchId }, "Search cancelled during enrichment loop");
          return;
        }

        const chunk = uniqueLeads.slice(i, i + batchSize);
        const chunkResults = await Promise.all(
          chunk.map(async ({ lead: raw, dedupeKey }) => {
            let profile: any = null;
            if (raw.website && raw.website.startsWith("http")) {
              const lower = raw.website.toLowerCase();
              if (
                lower.includes("facebook.com") ||
                lower.includes("instagram.com") ||
                lower.includes("linkedin.com")
              ) {
                profile = {
                  company_name: raw.companyName,
                  company_website: raw.website,
                  company_location: raw.address || location,
                  company_facebook: lower.includes("facebook.com") ? raw.website : undefined,
                  company_instagram: lower.includes("instagram.com") ? raw.website : undefined,
                  company_linkedin: lower.includes("linkedin.com") ? raw.website : undefined,
                  company_emails: raw.email ? [raw.email] : [],
                  company_phones: raw.phoneE164 ? [raw.phoneE164] : raw.phoneRaw ? [raw.phoneRaw] : [],
                  founder_emails: [],
                  founder_phones: [],
                  founder_socials: [],
                  manager_emails: [],
                  manager_phones: [],
                  manager_socials: [],
                };
              } else {
                try {
                  profile = await Promise.race([
                    scrapeFullCompanyProfile(raw.website, {
                      name: raw.companyName,
                      location: raw.address || raw.city || location,
                      phone: raw.phoneE164 || raw.phoneRaw,
                      email: raw.email,
                      operator: raw.operator,
                      facebook: raw.facebookUrl,
                      instagram: raw.instagramUrl,
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Crawl timeout")), 10000)),
                  ]);
                } catch {
                  // Graceful fallback to raw lead data
                }
              }
            }
            return { raw, profile, dedupeKey };
          })
        );

        enrichedResults.push(...chunkResults);

        const pct = 60 + Math.floor(((i + chunk.length) / uniqueLeads.length) * 30);
        await db.lead_searches.update({
          where: { id: searchId },
          data: {
            progress_pct: Math.min(pct, 90),
            current_step: `Enriched ${enrichedResults.length} / ${uniqueLeads.length} leads...`,
          },
        });

        if (i + batchSize < uniqueLeads.length) {
          await new Promise((r) => setTimeout(r, 40));
        }
      }
    } else {
      // For Meta Ads, LinkedIn (B2B), or Google Maps basic mode
      for (const { lead: raw, dedupeKey } of uniqueLeads) {
        enrichedResults.push({ raw, profile: null, dedupeKey });
      }
      await db.lead_searches.update({
        where: { id: searchId },
        data: {
          progress_pct: 85,
          current_step: `Processed ${uniqueLeads.length} leads ready to save...`,
        },
      });
    }

    if (await isSearchCancelled(searchId)) return;

    // Step 5: Persist Leads to Database (90% -> 99%)
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        progress_pct: 92,
        current_step: "Saving verified leads to tenant database",
      },
    });

    const savedLeads: any[] = [];
    for (const { raw, profile, dedupeKey } of enrichedResults) {
      let email: string | undefined;
      let emailType: any = "generic";
      let emailStatus: any = "unknown";
      let founderEmail: string | undefined;
      let managerEmail: string | undefined;
      let companyEmail: string | undefined;
      let facebookUrl: string | undefined = raw.facebookUrl;
      let instagramUrl: string | undefined = raw.instagramUrl;
      let linkedinUrl: string | undefined = raw.linkedinUrl;

      const finalWebsite = profile?.company_website || raw.website || undefined;

      if (profile) {
        companyEmail = profile.company_emails?.[0];
        founderEmail = profile.founder_emails?.[0];
        managerEmail = profile.manager_emails?.[0];
        email = founderEmail || companyEmail || managerEmail;
        if (profile.company_facebook) facebookUrl = formatSocialUrl(profile.company_facebook, "facebook");
        if (profile.company_instagram) instagramUrl = formatSocialUrl(profile.company_instagram, "instagram");
        if (profile.company_linkedin) linkedinUrl = formatSocialUrl(profile.company_linkedin, "linkedin");
      }

      if (!email && raw.email) {
        email = raw.email;
        companyEmail = companyEmail || raw.email;
      }

      if (email) {
        emailType = "role";
        emailStatus = "valid";
      }

      try {
        const lead = await db.leads.create({
          data: {
            user_id: userId,
            search_id: searchId,
            dedupe_key: dedupeKey,
            company_name: raw.companyName,
            email: email || null,
            email_type: email ? emailType : null,
            email_status: email ? emailStatus : null,
            phone: raw.phoneE164 || null,
            phone_raw: raw.phoneRaw || null,
            website: finalWebsite || null,
            address: raw.address || null,
            city: raw.city || location || null,
            country: raw.country || null,
            rating: raw.rating as any,
            reviews_count: raw.reviewsCount || null,
            business_type: raw.businessType || null,
            source,
            source_ref: raw.sourceRef || null,
            facebook_url: facebookUrl || null,
            instagram_url: instagramUrl || null,
            linkedin_url: linkedinUrl || null,
            extra: {
              ...(raw.extra || {}),
              founder_name: profile?.founder_name || raw.extra?.founder_name || raw.operator || null,
              founder_email: founderEmail || raw.extra?.founder_email || null,
              founder_phones: profile?.founder_phones || raw.extra?.founder_phones || [],
              founder_socials: profile?.founder_socials || raw.extra?.founder_socials || [],
              manager_name: profile?.manager_name || raw.extra?.manager_name || null,
              manager_email: managerEmail || raw.extra?.manager_email || null,
              manager_phones: profile?.manager_phones || raw.extra?.manager_phones || [],
              manager_socials: profile?.manager_socials || raw.extra?.manager_socials || [],
              company_email: companyEmail || null,
              profile,
            },
            status: "new",
            collected_at: new Date(),
          },
        });
        savedLeads.push(lead);
      } catch {
        // Ignored if concurrent unique constraint dedupe key was hit
      }
    }

    if (savedLeads.length > 0) {
      trackUsageIncrement(userId, "monthly_leads", savedLeads.length).catch(() => {});
    }

    // Step 6: Final Completion (100%)
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        status: "completed",
        progress_pct: 100,
        current_step: `Completed: Saved ${savedLeads.length} leads (${duplicateCount} duplicates skipped)`,
        found_count: rawLeads.length,
        enriched_count: savedLeads.length,
        finished_at: new Date(),
      },
    });

    logger.info({ searchId, savedCount: savedLeads.length }, "Lead search completed successfully");
  } catch (err: any) {
    logger.error({ err, searchId }, "Lead search job failed");
    const userSafeError = sanitizeUserFacingLeadError(err?.message);
    await db.lead_searches.update({
      where: { id: searchId },
      data: {
        status: "failed",
        progress_pct: 100,
        current_step: userSafeError,
        error: userSafeError,
        finished_at: new Date(),
      },
    });
  }
}

function sanitizeUserFacingLeadError(rawError?: string | null): string {
  if (!rawError) return "Lead search provider temporarily unavailable, please try again in a moment.";
  const lower = rawError.toLowerCase();
  if (
    lower.includes("apify") ||
    lower.includes("token") ||
    lower.includes("unauthorized") ||
    lower.includes("401") ||
    lower.includes("403") ||
    lower.includes("429") ||
    lower.includes("actor") ||
    lower.includes("scraper execution failed")
  ) {
    return "Lead search provider temporarily unavailable, please try again in a moment.";
  }
  return rawError;
}

/**
 * BullMQ Worker for Lead Search Jobs
 */
export function startLeadSearchWorker() {
  return new Worker(
    QUEUE_NAMES.LEAD_SEARCH,
    async (job) => {
      const { searchId } = job.data;
      if (!searchId) return;
      await executeLeadSearch(searchId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 3,
    }
  );
}
