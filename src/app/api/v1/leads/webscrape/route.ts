import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { scrapeFullCompanyProfile } from "@/server/providers/leads/enrichment";
import { resolveOfficialWebsite } from "@/server/providers/leads/google-maps";

export async function POST(req: NextRequest) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", role: "admin" } as any,
    };
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { items, website, websites } = body;

  // Single website scrape
  if (website) {
    const companyName = body.company_name || body.name || "Business";
    const companyLocation = body.company_location || body.location || "";
    const phone = body.company_phones?.[0] || body.phone;
    const scraped = await scrapeFullCompanyProfile(website, {
      name: companyName,
      location: companyLocation,
      phone,
    });
    return NextResponse.json({ data: scraped });
  }

  // Batch items scrape (accepts array of objects or strings)
  const targetList = Array.isArray(items)
    ? items
    : Array.isArray(websites)
      ? websites.map((w: any) => (typeof w === "string" ? { website: w, company_name: "Business" } : w))
      : null;

  if (targetList) {
    const results: any[] = [];
    const listToProcess = targetList.slice(0, 30);
    const batchSize = 3;

    for (let i = 0; i < listToProcess.length; i += batchSize) {
      const chunk = listToProcess.slice(i, i + batchSize);
      const chunkResults = await Promise.all(
        chunk.map(async (item: any) => {
          try {
            const rawSite = typeof item === "string" ? item : item.website;
            const companyName = typeof item === "string" ? "Business" : item.company_name || item.name || "Business";
            const location = typeof item === "string" ? "" : item.company_location || item.location || item.city || "";
            const phone = typeof item === "string" ? undefined : item.company_phones?.[0] || item.phone;

            let site = rawSite && rawSite !== "business.com" && rawSite !== "Not Available" ? rawSite : "";
            if (!site && companyName && companyName !== "Business") {
              site = (await resolveOfficialWebsite(companyName, location)) || "";
            }

            const email = typeof item === "string" ? undefined : item.company_emails?.[0] || item.email;
            const operator = typeof item === "string" ? undefined : item.founder_name;
            const facebook = typeof item === "string" ? undefined : item.company_facebook;
            const instagram = typeof item === "string" ? undefined : item.company_instagram;
            const linkedin = typeof item === "string" ? undefined : item.company_linkedin;

            const profile = await scrapeFullCompanyProfile(site, {
              name: companyName,
              location,
              phone,
              email,
              operator,
              facebook,
              instagram,
              linkedin,
            });

            if (profile) {
              if ((!profile.company_emails || profile.company_emails.length === 0) && item.company_emails?.length) {
                profile.company_emails = item.company_emails;
              }
              if ((!profile.company_phones || profile.company_phones.length === 0) && item.company_phones?.length) {
                profile.company_phones = item.company_phones;
              }
              const isJunkPerson = (val?: string) => {
                if (!val) return true;
                const l = val.toLowerCase();
                return l.includes("proprietor") || l.includes("entity") || l.includes("management") || l.includes("llc") || l.includes("inc.") || l.includes("ltd") || l.includes("agency") || val === "Not Available";
              };

              if (!profile.founder_name && item.founder_name && !isJunkPerson(item.founder_name)) {
                profile.founder_name = item.founder_name;
              }
              if ((!profile.founder_emails || profile.founder_emails.length === 0) && item.founder_emails?.length && profile.founder_name) {
                profile.founder_emails = item.founder_emails;
              }
              if ((!profile.founder_phones || profile.founder_phones.length === 0) && item.founder_phones?.length && profile.founder_name) {
                profile.founder_phones = item.founder_phones;
              }
              if ((!profile.founder_socials || profile.founder_socials.length === 0) && item.founder_socials?.length && profile.founder_name) {
                profile.founder_socials = item.founder_socials.filter((s: string) => !s.includes("/search/"));
              }
              if (!profile.manager_name && item.manager_name && !isJunkPerson(item.manager_name)) {
                profile.manager_name = item.manager_name;
              }
              if ((!profile.manager_emails || profile.manager_emails.length === 0) && item.manager_emails?.length && profile.manager_name) {
                profile.manager_emails = item.manager_emails;
              }
              if ((!profile.manager_phones || profile.manager_phones.length === 0) && item.manager_phones?.length && profile.manager_name) {
                profile.manager_phones = item.manager_phones;
              }
              if ((!profile.manager_socials || profile.manager_socials.length === 0) && item.manager_socials?.length && profile.manager_name) {
                profile.manager_socials = item.manager_socials.filter((s: string) => !s.includes("/search/"));
              }
              if (!profile.company_facebook && item.company_facebook) {
                profile.company_facebook = item.company_facebook;
              }
              if (!profile.company_instagram && item.company_instagram) {
                profile.company_instagram = item.company_instagram;
              }
              if (!profile.company_linkedin && item.company_linkedin) {
                profile.company_linkedin = item.company_linkedin;
              }
            }
            return profile;
          } catch {
            return null;
          }
        })
      );
      results.push(...chunkResults.filter(Boolean));
      if (i + batchSize < listToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
    }
    return NextResponse.json({ data: results });
  }

  return NextResponse.json({ error: "Missing website, websites, or items array" }, { status: 422 });
}
