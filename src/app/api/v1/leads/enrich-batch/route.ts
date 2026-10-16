import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { scrapeFullCompanyProfile, categorizeEmail, formatSocialUrl } from "@/server/providers/leads/enrichment";
import { resolveOfficialWebsite } from "@/server/providers/leads/google-maps";

export const maxDuration = 300; // 5 minutes max

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

  const { leadIds } = body;
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    return NextResponse.json({ error: "leadIds array is required" }, { status: 422 });
  }

  // 1. Fetch only leads owned by this authenticated user (limit to 50 max per batch)
  const targetIds = leadIds.slice(0, 50);
  const leadsToEnrich = await db.leads.findMany({
    where: {
      id: { in: targetIds },
      user_id: session.user.id,
    },
  });

  if (leadsToEnrich.length === 0) {
    return NextResponse.json({
      data: {
        enrichedCount: 0,
        totalProcessed: 0,
        leads: [],
      },
    });
  }

  const updatedLeads: any[] = [];
  let enrichedCount = 0;

  // 2. Concurrency Pool: Process in chunks of 3 to be gentle on VPS CPU & RAM
  const batchSize = 3;
  for (let i = 0; i < leadsToEnrich.length; i += batchSize) {
    const chunk = leadsToEnrich.slice(i, i + batchSize);

    const chunkResults = await Promise.all(
      chunk.map(async (lead: any) => {
        try {
          let website = lead.website;
          const companyName = lead.company_name || "Business";
          const location = lead.address || lead.city || "";

          // Resolve website if missing
          if (!website || website === "Not Available" || website === "—") {
            try {
              website = await resolveOfficialWebsite(companyName, location);
            } catch {}
          }

          if (!website || !website.startsWith("http")) {
            return lead;
          }

          // Deep crawl with 12s timeout
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
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 12000)),
          ]);

          if (!profile) return lead;

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

          if (!lead.email && bestEmail) {
            enrichedCount++;
          }

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
            },
          });

          return updated || lead;
        } catch {
          return lead;
        }
      })
    );

    updatedLeads.push(...chunkResults);

    // Minor breathing interval between batches
    if (i + batchSize < leadsToEnrich.length) {
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
  }

  return NextResponse.json({
    data: {
      enrichedCount,
      totalProcessed: leadsToEnrich.length,
      leads: updatedLeads,
    },
  });
}
