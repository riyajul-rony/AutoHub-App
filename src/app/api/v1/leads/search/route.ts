import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getUserBrightDataKey } from "@/server/api-keys/service";
import { getBrightDataAdapter, type BrightDataLeadSource } from "@/server/providers/leads/bright-data";
import { filterDuplicateLeads, computeLeadDedupeKey } from "@/server/providers/leads/dedupe";
import { scrapeFullCompanyProfile, formatSocialUrl } from "@/server/providers/leads/enrichment";
import { db } from "@/server/db";
import { assertLimit } from "@/server/billing/limits";
import { trackUsageIncrement } from "@/server/billing/usage-tracker";

// Allow up to 5 minutes for the scraping and enrichment job
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const keyword = body.keyword;
  const location = body.location;
  const source: BrightDataLeadSource = (body.source || "google_maps") as BrightDataLeadSource;
  const max_results = body.max_results ?? body.maxResults ?? 15;
  const find_emails = body.find_emails ?? body.findEmails ?? true;
  const only_with_website = body.only_with_website ?? body.onlyWithWebsite;
  const requireWebsite = only_with_website === true;

  if (!keyword || !location) {
    return NextResponse.json({ error: "Keyword and location are required." }, { status: 422 });
  }

  // Enforce plan quota for leads
  try {
    await assertLimit(session.user.id, "monthly_leads", 1);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  // 1. Verify user's personal Bright Data API key is configured
  const brightDataKey = await getUserBrightDataKey(session.user.id);
  if (!brightDataKey) {
    return NextResponse.json(
      {
        error: "Bright Data API key required. Please configure your personal Bright Data API key in Settings before searching leads.",
      },
      { status: 400 }
    );
  }

  // 2. Record initial search job
  const searchRecord = await db.lead_searches.create({
    data: {
      user_id: session.user.id,
      source,
      provider_used: "bright_data",
      params: {
        keyword,
        location,
        max_results,
        find_emails,
        only_with_website: requireWebsite,
      },
      status: "running",
      started_at: new Date(),
    },
  });

  try {
    // 3. Fetch raw leads via Bright Data Adapter for selected source
    const adapter = getBrightDataAdapter(source);
    const rawLeads = await adapter.search(
      {
        keyword,
        location,
        maxResults: Math.min(Math.max(Number(max_results) || 15, 1), 500),
        findEmails: find_emails,
        onlyWithWebsite: requireWebsite,
      },
      brightDataKey
    );

    // 4. Load existing leads for this user to perform deduplication
    const existingLeads = await db.leads.findMany({
      where: { user_id: session.user.id },
      select: { dedupe_key: true },
    });
    const existingKeys = new Set<string>(
      existingLeads.map((l: any) => l.dedupe_key).filter(Boolean)
    );

    // 5. Apply deduplication (hash of user_id + company_name + identifier)
    const { uniqueLeads, duplicateCount } = filterDuplicateLeads(
      session.user.id,
      rawLeads,
      existingKeys
    );

    const savedLeads: any[] = [];
    let enrichedCount = 0;

    // 6. Deep Crawl & Enrich website profiles for unique leads with websites
    const enrichedResults: Array<{ raw: any; profile: any; dedupeKey: string }> = [];
    const batchSize = 5;

    for (let i = 0; i < uniqueLeads.length; i += batchSize) {
      const chunk = uniqueLeads.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(async ({ lead: raw, dedupeKey }) => {
          let profile: any = null;
          if (find_emails && raw.website && raw.website.startsWith("http")) {
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
                  new Promise((_, reject) => setTimeout(() => reject(new Error("Crawl timeout")), 8000)),
                ]);
              } catch {
                // Continue gracefully if crawl times out
              }
            }
          }
          return { raw, profile, dedupeKey };
        })
      );

      enrichedResults.push(...chunkResults);
      if (i + batchSize < uniqueLeads.length) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
    }

    // 7. Persist enriched unique leads to DB
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
        enrichedCount++;
      }

      try {
        const lead = await db.leads.create({
          data: {
            user_id: session.user.id,
            search_id: searchRecord.id,
            dedupe_key: dedupeKey,
            company_name: raw.companyName,
            email,
            email_type: email ? emailType : null,
            email_status: email ? emailStatus : null,
            phone: raw.phoneE164,
            phone_raw: raw.phoneRaw,
            website: finalWebsite,
            address: raw.address,
            city: raw.city,
            country: raw.country,
            rating: raw.rating as any,
            reviews_count: raw.reviewsCount,
            business_type: raw.businessType,
            source,
            source_ref: raw.sourceRef,
            facebook_url: facebookUrl,
            instagram_url: instagramUrl,
            linkedin_url: linkedinUrl,
            extra: {
              founder_name: profile?.founder_name || raw.operator,
              founder_email: founderEmail,
              founder_phones: profile?.founder_phones,
              founder_socials: profile?.founder_socials,
              manager_name: profile?.manager_name,
              manager_email: managerEmail,
              manager_phones: profile?.manager_phones,
              manager_socials: profile?.manager_socials,
              company_email: companyEmail,
              profile,
            },
            status: "new",
            collected_at: new Date(),
          },
        });
        savedLeads.push(lead);
      } catch {
        // Ignored if duplicate constraint was hit
      }
    }

    // 8. Update search record status
    await db.lead_searches.update({
      where: { id: searchRecord.id },
      data: {
        status: "completed",
        found_count: rawLeads.length,
        enriched_count: savedLeads.length,
        finished_at: new Date(),
      },
    });

    if (savedLeads.length > 0) {
      trackUsageIncrement(session.user.id, "monthly_leads", savedLeads.length).catch(() => {});
    }

    // 9. Format leads for 18-field client view
    const baseResults = savedLeads.length > 0
      ? savedLeads
      : enrichedResults.map((r) => ({
          ...r.raw,
          website: r.profile?.company_website || r.raw.website,
          extra: { profile: r.profile },
        }));

    const formattedLeads = baseResults.map((r: any) => {
      const name = r.company_name || r.companyName || "Business";
      const loc = r.address || r.city || location || "Not Available";
      const phone = (r.phone || r.phoneE164 || r.phoneRaw || "").replace(/^\+/, "").trim();
      const prof = r.extra?.profile;

      const companyEmails: string[] = prof?.company_emails?.length
        ? prof.company_emails
        : r.extra?.company_email
        ? [r.extra.company_email]
        : r.email
        ? [r.email]
        : [];

      const companyPhones: string[] = prof?.company_phones?.length
        ? prof.company_phones
        : phone
        ? [phone]
        : [];

      const founderName = prof?.founder_name || r.extra?.founder_name || undefined;
      const managerName = prof?.manager_name || r.extra?.manager_name || undefined;

      const founderEmailsList = founderName && prof?.founder_emails?.length
        ? prof.founder_emails
        : founderName && r.extra?.founder_email
        ? [r.extra.founder_email]
        : [];

      const founderPhonesList = founderName && prof?.founder_phones?.length
        ? prof.founder_phones
        : founderName && r.extra?.founder_phones?.length
        ? r.extra.founder_phones
        : [];

      const founderSocialsList = founderName && prof?.founder_socials?.length
        ? prof.founder_socials
        : founderName && r.extra?.founder_socials?.length
        ? r.extra.founder_socials
        : [];

      const managerEmailsList = managerName && prof?.manager_emails?.length
        ? prof.manager_emails
        : managerName && r.extra?.manager_email
        ? [r.extra.manager_email]
        : [];

      const managerPhonesList = managerName && prof?.manager_phones?.length
        ? prof.manager_phones
        : managerName && r.extra?.manager_phones?.length
        ? r.extra.manager_phones
        : [];

      const managerSocialsList = managerName && prof?.manager_socials?.length
        ? prof.manager_socials
        : managerName && r.extra?.manager_socials?.length
        ? r.extra.manager_socials
        : [];

      return {
        // 1-10 Company details
        company_name: name,
        company_emails: companyEmails,
        company_phones: companyPhones,
        company_website: r.website || prof?.company_website || undefined,
        company_facebook: formatSocialUrl(prof?.company_facebook || r.facebook_url, "facebook"),
        company_instagram: formatSocialUrl(prof?.company_instagram || r.instagram_url, "instagram"),
        company_linkedin: formatSocialUrl(prof?.company_linkedin || r.linkedin_url, "linkedin"),
        company_tiktok: formatSocialUrl(prof?.company_tiktok, "tiktok"),
        company_youtube: formatSocialUrl(prof?.company_youtube, "youtube"),
        company_location: loc,
        address: r.address || loc,
        city: r.city || location,

        // 11-14 Founder details
        founder_name: founderName,
        founder_phones: founderPhonesList,
        founder_emails: founderEmailsList,
        founder_socials: founderSocialsList,

        // 15-18 Manager details
        manager_name: managerName,
        manager_emails: managerEmailsList,
        manager_phones: managerPhonesList,
        manager_socials: managerSocialsList,

        // Aliases
        phone: phone || undefined,
        website: r.website || undefined,
        rating: r.rating || undefined,
        facebook_url: formatSocialUrl(prof?.company_facebook || r.facebook_url, "facebook"),
        instagram_url: formatSocialUrl(prof?.company_instagram || r.instagram_url, "instagram"),
        linkedin_url: formatSocialUrl(prof?.company_linkedin || r.linkedin_url, "linkedin"),
      };
    });

    return NextResponse.json({
      data: {
        searchId: searchRecord?.id,
        leads: formattedLeads,
        totalFound: rawLeads.length,
        duplicatesSkipped: duplicateCount,
        totalEnriched: savedLeads.length,
      },
    });
  } catch (err: any) {
    await db.lead_searches.update({
      where: { id: searchRecord.id },
      data: {
        status: "failed",
        finished_at: new Date(),
      },
    });

    return NextResponse.json(
      {
        error: err.message || "Failed to extract leads via Bright Data",
      },
      { status: 500 }
    );
  }
}
