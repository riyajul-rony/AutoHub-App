import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { scrapeFullCompanyProfile, categorizeEmail, formatSocialUrl } from "@/server/providers/leads/enrichment";
import { resolveOfficialWebsite } from "@/server/providers/leads/google-maps";

export const maxDuration = 120; // 2 minutes max

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  const { id } = await params;

  // 1. Multi-tenant isolation: verify lead belongs to current user
  const lead = await db.leads.findFirst({
    where: {
      id,
      user_id: session.user.id,
    },
  });

  if (!lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  let website = lead.website;
  const companyName = lead.company_name || "Business";
  const location = lead.address || lead.city || "";

  // 2. Resolve official website if missing
  if (!website || website === "Not Available" || website === "—") {
    try {
      website = await resolveOfficialWebsite(companyName, location);
    } catch {}
  }

  if (!website || !website.startsWith("http")) {
    return NextResponse.json(
      { error: `Could not identify an active website for "${companyName}". Please provide a website URL to enrich.` },
      { status: 422 }
    );
  }

  try {
    // 3. Deep-crawl company website and subpages
    const profile = await Promise.race([
      scrapeFullCompanyProfile(website, {
        name: companyName,
        location,
        phone: lead.phone || lead.phone_raw,
        email: lead.email,
        operator: lead.extra?.founder_name,
        facebook: lead.facebook_url,
        instagram: lead.instagram_url,
        linkedin: lead.linkedin_url,
      }),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Crawl timeout")), 15000)),
    ]);

    if (!profile) {
      return NextResponse.json({ error: "Failed to scrape profile." }, { status: 500 });
    }

    // 4. Extract authentic contacts
    const companyEmail = profile.company_emails?.[0];
    const founderEmail = profile.founder_emails?.[0];
    const managerEmail = profile.manager_emails?.[0];
    const bestEmail = founderEmail || companyEmail || managerEmail || lead.email;

    const emailType = bestEmail ? categorizeEmail(bestEmail) : lead.email_type;
    const emailStatus = bestEmail ? "valid" : lead.email_status;

    const bestPhone = profile.company_phones?.[0] || lead.phone || lead.phone_raw;
    const fb = formatSocialUrl(profile.company_facebook || lead.facebook_url, "facebook");
    const ig = formatSocialUrl(profile.company_instagram || lead.instagram_url, "instagram");
    const li = formatSocialUrl(profile.company_linkedin || lead.linkedin_url, "linkedin");

    // 5. Update lead record in database
    const updated = await db.leads.update({
      where: { id: lead.id },
      data: {
        website: profile.company_website || website,
        email: bestEmail,
        email_type: emailType,
        email_status: emailStatus,
        phone: bestPhone,
        facebook_url: fb,
        instagram_url: ig,
        linkedin_url: li,
        extra: {
          ...(lead.extra || {}),
          founder_name: profile.founder_name || lead.extra?.founder_name,
          founder_email: founderEmail || lead.extra?.founder_email,
          founder_phones: profile.founder_phones?.length ? profile.founder_phones : lead.extra?.founder_phones,
          founder_socials: profile.founder_socials?.length ? profile.founder_socials : lead.extra?.founder_socials,
          manager_name: profile.manager_name || lead.extra?.manager_name,
          manager_email: managerEmail || lead.extra?.manager_email,
          manager_phones: profile.manager_phones?.length ? profile.manager_phones : lead.extra?.manager_phones,
          manager_socials: profile.manager_socials?.length ? profile.manager_socials : lead.extra?.manager_socials,
          company_email: companyEmail,
          twitter_url: profile.company_twitter || lead.extra?.twitter_url,
          tiktok_url: profile.company_tiktok || lead.extra?.tiktok_url,
          youtube_url: profile.company_youtube || lead.extra?.youtube_url,
          profile,
        },
        status: bestEmail ? "contacted" : lead.status,
      },
    });

    return NextResponse.json({
      data: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Deep enrichment crawl failed" },
      { status: 500 }
    );
  }
}
