import { startActorRun, getActorRun, fetchDatasetItems, logApifyUsage } from "./client";
import { getApifySettings } from "./config";
import { withApifyKeyPool } from "./pool-service";
import type { RawLead } from "../types";
import { logger } from "@/server/logger";

export interface MetaAdsSearchOptions {
  keyword: string;
  country: string;
  maxLeads: number;
  activeOnly?: boolean;
  userId: string;
  onProgress?: (status: string, count: number) => void;
}

export interface MetaAdDetail {
  adId?: string;
  adCopy?: string;
  ctaText?: string;
  landingUrl?: string;
  startDate?: string;
  endDate?: string;
  platforms: string[];
  mediaType?: string;
  adLink?: string;
  isActive?: boolean;
}

export interface MetaAdsGroupedAdvertiser {
  pageId: string;
  pageName: string;
  adCount: number;
  sampleAdText?: string;
  ctaText?: string;
  landingUrl?: string;
  landingDomain?: string;
  platforms: string[];
  firstSeenDate?: string;
  lastSeenDate?: string;
  runningDays?: number;
  adLibraryUrl: string;
  facebookPageUrl: string;
  isActive?: boolean;
  ads: MetaAdDetail[];
}

/**
 * Builds the standard Meta Ad Library URL based on search keyword and country
 */
export function buildMetaAdsLibraryUrl(keyword: string, country: string, activeOnly: boolean = true): string {
  const status = activeOnly ? "active" : "all";
  const params = new URLSearchParams({
    active_status: status,
    ad_type: "all",
    country: (country || "US").toUpperCase(),
    q: keyword.trim(),
    search_type: "keyword_unordered",
  });
  return `https://www.facebook.com/ads/library/?${params.toString()}`;
}

/**
 * Extracts a clean domain from a landing or CTA URL.
 * Filters out social networks (Facebook, Instagram, WhatsApp, Messenger, Linktree)
 * so they are not treated as independent corporate websites.
 */
export function extractDomainFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) return undefined;
    const parsed = new URL(cleanUrl.startsWith("http") ? cleanUrl : `https://${cleanUrl}`);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    
    // Disallow social and link shortener domains as corporate websites
    const disallowedHosts = [
      "facebook.com",
      "instagram.com",
      "wa.me",
      "whatsapp.com",
      "m.me",
      "messenger.com",
      "bit.ly",
      "linktr.ee",
      "t.me",
      "telegram.me",
      "threads.net",
    ];

    if (disallowedHosts.some((d) => host === d || host.endsWith(`.${d}`))) {
      return undefined;
    }

    return host;
  } catch {
    return undefined;
  }
}

/**
 * Groups raw ads from Apify igolaizola/facebook-ad-library-scraper by advertiser page
 */
export function groupAdsByAdvertiser(
  ads: any[],
  searchKeyword: string,
  country: string,
  activeOnly: boolean
): MetaAdsGroupedAdvertiser[] {
  const map = new Map<string, MetaAdsGroupedAdvertiser>();

  for (const ad of ads) {
    if (!ad) continue;

    const pageId = String(
      ad.snapshot?.page_id ||
      ad.pageId ||
      ad.page_id ||
      ad.pageID ||
      ""
    ).trim();

    const pageName = String(
      ad.snapshot?.page_name ||
      ad.pageName ||
      ad.page_name ||
      ad.advertiserName ||
      ""
    ).trim();

    if (!pageId && !pageName) continue;

    const key = pageId || pageName.toLowerCase();

    // Extract creative text
    const text = String(
      ad.snapshot?.body?.text ||
      ad.adCreativeBody ||
      ad.ad_creative_body ||
      ad.adText ||
      ad.caption ||
      ""
    ).trim();

    // Extract CTA
    const cta = String(
      ad.snapshot?.cta_text ||
      ad.snapshot?.caption ||
      ad.ctaType ||
      ad.cta_type ||
      ad.ctaText ||
      ""
    ).trim();

    // Extract landing / CTA URL
    const rawLanding =
      ad.snapshot?.link_url ||
      ad.linkUrl ||
      ad.link_url ||
      ad.ctaUrl ||
      ad.targetUrl;

    const cleanDomain = extractDomainFromUrl(rawLanding);
    const landing = cleanDomain ? rawLanding : undefined;

    // Extract platforms
    const rawPlatforms: string[] = Array.isArray(ad.publisher_platform || ad.publisherPlatforms || ad.publisher_platforms || ad.platforms)
      ? (ad.publisher_platform || ad.publisherPlatforms || ad.publisher_platforms || ad.platforms)
      : [];

    const platforms = rawPlatforms.map((p) => String(p).toLowerCase());

    const startDate = ad.start_date || ad.startDate || ad.adDeliveryStartTime || ad.creationDate;
    const endDate = ad.end_date || ad.endDate || ad.adDeliveryStopTime;
    const adId = String(
      ad.ad_archive_id ||
      ad.adArchiveId ||
      ad.id ||
      ad.adId ||
      ""
    ).trim();

    const mediaType = ad.snapshot?.cards
      ? "carousel"
      : (ad.snapshot?.videos && ad.snapshot.videos.length > 0)
      ? "video"
      : (ad.snapshot?.images && ad.snapshot.images.length > 0)
      ? "image"
      : "text";

    const adSnapshotUrl =
      ad.adSnapshotUrl ||
      ad.ad_snapshot_url ||
      (adId ? `https://www.facebook.com/ads/library/?id=${adId}` : undefined);

    const isAdActive = ad.isActive ?? ad.is_active ?? (endDate ? false : true);

    const adDetail: MetaAdDetail = {
      adId: adId || undefined,
      adCopy: text || undefined,
      ctaText: cta || undefined,
      landingUrl: landing || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      platforms: Array.from(new Set(platforms)),
      mediaType,
      adLink: adSnapshotUrl || undefined,
      isActive: isAdActive,
    };

    if (!map.has(key)) {
      const fbUrl = pageId
        ? `https://www.facebook.com/${pageId}`
        : (ad.snapshot?.page_profile_uri || `https://www.facebook.com/search/top?q=${encodeURIComponent(pageName)}`);

      const adLibraryUrl = pageId
        ? `https://www.facebook.com/ads/library/?active_status=${activeOnly ? "active" : "all"}&ad_type=all&country=${country}&view_all_page_id=${pageId}&search_type=page`
        : buildMetaAdsLibraryUrl(pageName, country, activeOnly);

      const days = startDate
        ? Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)))
        : undefined;

      map.set(key, {
        pageId: pageId || `meta_${Math.random().toString(36).slice(2, 9)}`,
        pageName: pageName || "Advertiser",
        adCount: 1,
        sampleAdText: text || undefined,
        ctaText: cta || undefined,
        landingUrl: landing || undefined,
        landingDomain: cleanDomain,
        platforms: Array.from(new Set(platforms)),
        firstSeenDate: startDate || undefined,
        lastSeenDate: startDate || undefined,
        runningDays: days,
        adLibraryUrl,
        facebookPageUrl: fbUrl,
        isActive: isAdActive,
        ads: [adDetail],
      });
    } else {
      const existing = map.get(key)!;
      existing.adCount += 1;
      existing.ads.push(adDetail);
      if (!existing.sampleAdText && text) {
        existing.sampleAdText = text;
      }
      if (!existing.ctaText && cta) {
        existing.ctaText = cta;
      }
      if (!existing.landingUrl && landing) {
        existing.landingUrl = landing;
        existing.landingDomain = cleanDomain;
      }
      for (const p of platforms) {
        if (!existing.platforms.includes(p)) {
          existing.platforms.push(p);
        }
      }
      if (startDate && (!existing.firstSeenDate || new Date(startDate) < new Date(existing.firstSeenDate))) {
        existing.firstSeenDate = startDate;
        existing.runningDays = Math.max(
          0,
          Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
        );
      }
      if (isAdActive) {
        existing.isActive = true;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Searches Meta Ads Library via Apify igolaizola/facebook-ad-library-scraper,
 * with key pool routing, rental error cooldown, grouping by advertiser, and normalization.
 */
export async function searchMetaAdsApify(
  options: MetaAdsSearchOptions
): Promise<{
  allLeads: RawLead[];
  advertisers: MetaAdsGroupedAdvertiser[];
  totalAdsScraped: number;
  runId: string;
}> {
  return withApifyKeyPool("meta_ads_search", async ({ client, keyId }) => {
    const settings = await getApifySettings();
    const actorId = settings.actors.meta_ads || "igolaizola/facebook-ad-library-scraper";
    const unitPrice = settings.unitPrices.meta_ads ?? 0.0008;
    const targetLeads = Math.min(
      Math.max(options.maxLeads, 1),
      settings.limits.maxLeadsPerRun.meta_ads
    );

    const country = (options.country || "US").toUpperCase();
    const activeOnly = options.activeOnly ?? true;

    // Request 5x ads multiplier up to 2000 items cap to discover unique advertisers
    const multiplier = 5;
    const adResultsLimit = Math.min(Math.max(targetLeads * multiplier, 25), 2000);

    // Schema for igolaizola/facebook-ad-library-scraper (exact schema validated against Apify OpenAPI)
    const actorInput: Record<string, any> = {
      query: options.keyword,
      country: country,
      category: "all",
      mediaType: "all",
      sortBy: "mostRecent",
      activeStatus: activeOnly ? "active" : "all",
      advertisers: [],
      fetchDetails: false,
      maxItems: adResultsLimit,
    };

    // Server log full input parameters without tokens (clean audit trail)
    logger.info(
      {
        actorId,
        keyId,
        actorInput,
        targetLeads,
        adResultsLimit,
      },
      "[Meta Ads] Starting Apify actor run with key pool"
    );

    options.onProgress?.(`Dispatching Meta Ads scraper for "${options.keyword}" (${country})...`, 0);

    let run: { id: string; actId?: string; defaultDatasetId?: string };
    try {
      run = await startActorRun(actorId, actorInput, {
        maxTotalChargeUsd: Math.max(settings.limits.maxSpendUsd, targetLeads * unitPrice * 3),
        client,
      });
    } catch (err: any) {
      const errMsg = (err?.message || "").toLowerCase();
      const status = err?.statusCode || err?.status;
      if (
        status === 403 ||
        errMsg.includes("actor-is-not-rented") ||
        errMsg.includes("rental") ||
        errMsg.includes("not rented") ||
        errMsg.includes("rent")
      ) {
        const rentMsg = "এই account-এ igolaizola/facebook-ad-library-scraper rent করা নেই";
        logger.error({ actorId, keyId, error: err.message }, `[Meta Ads] ${rentMsg}`);
        const rentError = new Error(rentMsg);
        (rentError as any).statusCode = 403;
        (rentError as any).isRentalError = true;
        throw rentError;
      }
      logger.error({ actorId, keyId, error: err?.message }, "[Meta Ads] Failed to dispatch actor run");
      throw err;
    }

    const runUrl = `https://console.apify.com/actors/runs/${run.id}`;
    logger.info(
      {
        actorId,
        keyId,
        runId: run.id,
        runUrl,
      },
      "[Meta Ads] Actor run started"
    );

    options.onProgress?.("Scraping ad creatives from Meta Ad Library...", 0);

    // Poll until complete with dynamic timeout scaling
    let currentRun = await getActorRun(run.id, client);
    let attempts = 0;
    const maxAttempts = Math.max(150, Math.ceil(targetLeads * 1.5));

    while (
      (currentRun.status === "READY" || currentRun.status === "RUNNING") &&
      attempts < maxAttempts
    ) {
      attempts++;
      await new Promise((r) => setTimeout(r, 4000));
      currentRun = await getActorRun(run.id, client);
      if (attempts % 5 === 0) {
        options.onProgress?.(
          `Scraping ad creatives (run status: ${currentRun.status}, attempt ${attempts})...`,
          0
        );
      }
    }

    logger.info(
      {
        actorId,
        keyId,
        runId: run.id,
        runUrl,
        runStatus: currentRun.status,
        statusMessage: currentRun.statusMessage,
        attempts,
      },
      "[Meta Ads] Polling finished"
    );

    if (currentRun.status !== "SUCCEEDED") {
      logger.error(
        {
          actorId,
          keyId,
          runId: run.id,
          runUrl,
          runStatus: currentRun.status,
          statusMessage: currentRun.statusMessage,
        },
        "[Meta Ads] Actor run did not succeed"
      );

      if (currentRun.status === "TIMED-OUT") {
        throw new Error(
          "Meta Ads scraper timed out. Try requesting fewer leads or refining your search keyword."
        );
      }

      const statusMsg = currentRun.statusMessage || "";
      if (
        statusMsg.toLowerCase().includes("rent") ||
        statusMsg.toLowerCase().includes("rental")
      ) {
        const rentMsg = "এই account-এ igolaizola/facebook-ad-library-scraper rent করা নেই";
        const rentError = new Error(rentMsg);
        (rentError as any).statusCode = 403;
        (rentError as any).isRentalError = true;
        throw rentError;
      }

      throw new Error(
        currentRun.statusMessage || `Meta Ads actor run ended with status: ${currentRun.status}`
      );
    }

    options.onProgress?.("Processing and grouping ads by advertiser...", 0);

    const rawAds = await fetchDatasetItems<any>(currentRun.defaultDatasetId, {
      limit: adResultsLimit,
      client,
    });

    const grouped = groupAdsByAdvertiser(rawAds, options.keyword, country, activeOnly);
    const slicedAdvertisers = grouped.slice(0, targetLeads);

    logger.info(
      {
        actorId,
        keyId,
        runId: run.id,
        runUrl,
        runStatus: currentRun.status,
        rawDatasetCount: rawAds.length,
        groupedAdvertisersCount: grouped.length,
        finalReturnedLeadsCount: slicedAdvertisers.length,
      },
      "[Meta Ads] Dataset fetched, grouped, and normalized successfully"
    );

    if (rawAds.length === 0) {
      options.onProgress?.(
        `Meta Ad Library-তে "${options.keyword}" (${country})-এর জন্য কোনো বিজ্ঞাপন পাওয়া যায়নি।`,
        0
      );
    }

    const leads: RawLead[] = slicedAdvertisers.map((adv) => ({
      sourceRef: adv.pageId,
      companyName: adv.pageName,
      website: adv.landingUrl || (adv.landingDomain ? `https://${adv.landingDomain}` : undefined),
      facebookUrl: adv.facebookPageUrl,
      country,
      businessType: "Meta Ads Advertiser",
      extra: {
        meta_page_id: adv.pageId,
        ad_count: adv.adCount,
        sample_ad_text: adv.sampleAdText ? adv.sampleAdText.slice(0, 300) : undefined,
        cta_text: adv.ctaText,
        landing_url: adv.landingUrl,
        landing_domain: adv.landingDomain,
        platforms: adv.platforms,
        first_seen_date: adv.firstSeenDate,
        running_days: adv.runningDays,
        is_active: adv.isActive,
        ad_library_url: adv.adLibraryUrl,
        search_keyword: options.keyword,
        search_country: country,
        ads: adv.ads,
        provider: "Apify · igolaizola",
        apifyKeyId: keyId,
      },
    }));

    // Log Apify usage
    const estCost = rawAds.length * unitPrice;
    const actualCost = currentRun.chargeUsd ?? currentRun.usageTotalUsd;
    await logApifyUsage({
      userId: options.userId,
      module: "meta_ads",
      actorId,
      runId: run.id,
      itemCount: rawAds.length,
      estimatedCost: estCost,
      actualCost,
    });

    options.onProgress?.(
      `Discovered ${slicedAdvertisers.length} unique advertisers from ${rawAds.length} ads`,
      slicedAdvertisers.length
    );

    return {
      allLeads: leads,
      advertisers: slicedAdvertisers,
      totalAdsScraped: rawAds.length,
      runId: run.id,
    };
  });
}
