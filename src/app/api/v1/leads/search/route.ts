import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { googleMapsProvider } from "@/server/providers/leads/google-maps";
import { scrapeFullCompanyProfile } from "@/server/providers/leads/enrichment";
import { getUserPlacesKey } from "@/server/providers/leads/places-key";
import { db } from "@/server/db";

export async function POST(req: NextRequest) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@example.com",
        role: "admin",
      } as any,
    };
  }

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
  const max_results = body.max_results ?? body.maxResults ?? 15;
  const find_emails = body.find_emails ?? body.findEmails ?? true;
  const skip_duplicates = body.skip_duplicates ?? body.skipDuplicates ?? true;
  const only_with_website = body.only_with_website ?? body.onlyWithWebsite;
  const requireWebsite = only_with_website !== false;

  if (!keyword || !location) {
    return NextResponse.json({ error: "Keyword and location are required." }, { status: 422 });
  }

  // 1. Record search job
  const searchRecord = await db.lead_searches.create({
    data: {
      user_id: session.user.id,
      source: "google_maps",
      provider_used: "places_api",
      params: { keyword, location, max_results, find_emails, only_with_website: requireWebsite },
      status: "running",
      started_at: new Date(),
    },
  });

  // 2. Fetch raw leads from provider (using user's personal Google key if connected)
  const userApiKey = await getUserPlacesKey(session.user.id);
  const rawLeads = await googleMapsProvider.search({
    keyword,
    location,
    maxResults: Math.min(Math.max(Number(max_results) || 15, 5), 500),
    findEmails: find_emails ?? true,
    skipDuplicates: skip_duplicates ?? true,
    userApiKey,
    onlyWithWebsite: requireWebsite,
  });

  const savedLeads: any[] = [];
  let enrichedCount = 0;

  const rawResults: Array<{ raw: any; profile: any }> = [];
  const batchSize = 8;
  for (let i = 0; i < rawLeads.length; i += batchSize) {
    const chunk = rawLeads.slice(i, i + batchSize);
    const chunkResults = await Promise.all(
      chunk.map(async (raw) => {
        let profile: any = null;
        if (find_emails && raw.website) {
          try {
            profile = await scrapeFullCompanyProfile(raw.website, {
              name: raw.companyName,
              location: raw.address || raw.city || location,
              phone: raw.phoneE164 || raw.phoneRaw,
              email: raw.email,
              operator: raw.operator,
              facebook: raw.facebookUrl,
              instagram: raw.instagramUrl,
            });
          } catch {
            // Continue if crawl times out
          }
        }
        return { raw, profile };
      })
    );
    rawResults.push(...chunkResults);
    if (i + batchSize < rawLeads.length) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  const filteredRawResults = rawResults.filter(({ raw, profile }) => {
    if (!requireWebsite) return true;
    const site = profile?.company_website || raw.website;
    return Boolean(site && site !== "Not Available" && site !== "—");
  });

  for (const { raw, profile } of filteredRawResults) {
    let email: string | undefined;
    let emailType: any = "generic";
    let emailStatus: any = "unknown";
    let founderEmail: string | undefined;
    let managerEmail: string | undefined;
    let companyEmail: string | undefined;
    let facebookUrl: string | undefined;
    let instagramUrl: string | undefined;
    let linkedinUrl: string | undefined;

    const finalWebsite = profile?.company_website || raw.website || undefined;

    if (profile) {
      companyEmail = profile.company_emails?.[0];
      founderEmail = profile.founder_emails?.[0];
      managerEmail = profile.manager_emails?.[0];
      email = founderEmail || companyEmail || managerEmail;
      facebookUrl = profile.company_facebook;
      instagramUrl = profile.company_instagram;
      linkedinUrl = profile.company_linkedin;
    }

    if (!email && raw.email) {
      email = raw.email;
      companyEmail = companyEmail || raw.email;
    }
    if (!facebookUrl && raw.facebookUrl) facebookUrl = raw.facebookUrl;
    if (!instagramUrl && raw.instagramUrl) instagramUrl = raw.instagramUrl;

    if (email) {
      emailType = "role";
      emailStatus = "valid";
      enrichedCount++;
    }

    const dedupeKey = raw.sourceRef || `${raw.companyName}_${raw.phoneE164 || raw.phoneRaw}`;

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
          source: "google_maps",
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
      // Duplicates gracefully skipped by unique constraint
    }
  }

  // Update search completion
  await db.lead_searches.update({
    where: { id: searchRecord.id },
    data: {
      status: "completed",
      found_count: filteredRawResults.length,
      enriched_count: enrichedCount,
      finished_at: new Date(),
    },
  });

  const baseResults = savedLeads.length > 0
    ? savedLeads
    : filteredRawResults.map((r) => ({
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
      company_facebook: prof?.company_facebook || r.facebook_url || undefined,
      company_instagram: prof?.company_instagram || r.instagram_url || undefined,
      company_linkedin: prof?.company_linkedin || r.linkedin_url || undefined,
      company_tiktok: prof?.company_tiktok || undefined,
      company_youtube: prof?.company_youtube || undefined,
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
      facebook_url: prof?.company_facebook || r.facebook_url || undefined,
      instagram_url: prof?.company_instagram || r.instagram_url || undefined,
      linkedin_url: prof?.company_linkedin || r.linkedin_url || undefined,
    };
  });

  return NextResponse.json({
    data: {
      searchId: searchRecord?.id || "dev-search-1",
      leads: formattedLeads,
      totalFound: rawLeads.length,
      totalEnriched: rawLeads.length,
    },
  });
}
