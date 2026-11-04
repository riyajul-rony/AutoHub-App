import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { assertLimit } from "@/server/billing/limits";
import { queueLeadSearch } from "@/server/queues";
import { executeLeadSearch } from "@/server/worker/lead-search-worker";
import { isApifyConfigured, getApifySettings } from "@/server/providers/leads/apify/config";
import { parseGoogleMapsLines } from "@/server/providers/leads/apify/line-parser";

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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // 1. Verify Apify Integration is Configured
  const configured = await isApifyConfigured();
  if (!configured) {
    return NextResponse.json(
      {
        error:
          "Lead search provider temporarily unavailable, please try again in a moment.",
      },
      { status: 503 }
    );
  }

  const settings = await getApifySettings();
  const source = (body.source || "google_maps") as "google_maps" | "meta_ads" | "linkedin";

  const SAFETY_CEILING = 1000;
  const sourceKey = source === "linkedin" ? "b2b_leads" : source;
  const adminLimit = Math.min(
    Math.max(Number(settings.limits.maxLeadsPerRun[sourceKey]) || 100, 1),
    SAFETY_CEILING
  );

  // Validate max leads dynamically against admin configured setting and safety ceiling
  const rawMax = body.max_results ?? body.maxResults;
  const parsedMax = Number(rawMax);
  if (
    rawMax === undefined ||
    rawMax === null ||
    rawMax === "" ||
    !Number.isInteger(parsedMax) ||
    parsedMax < 1 ||
    parsedMax > adminLimit
  ) {
    return NextResponse.json(
      {
        error: `Please enter a number between 1 and ${adminLimit}.`,
      },
      { status: 422 }
    );
  }
  const clampedMax = parsedMax;

  // Validate inputs per module
  let parsedParams: Record<string, any> = {};

  if (source === "google_maps") {
    const rawMultiLine = typeof body.multi_line_input === "string" ? body.multi_line_input : "";
    let lines = Array.isArray(body.lines) ? body.lines : [];

    if (lines.length === 0 && body.keyword) {
      const kw = String(body.keyword).trim();
      const loc = typeof body.location === "string" ? body.location.trim() : "";
      if (kw) {
        lines = [{ niche: kw, location: loc || "USA" }];
      }
    } else if (lines.length === 0 && rawMultiLine) {
      const parsed = parseGoogleMapsLines(rawMultiLine);
      if (parsed.errors.length > 0 && parsed.validLines.length === 0) {
        return NextResponse.json(
          { error: parsed.errors[0].error, errors: parsed.errors },
          { status: 422 }
        );
      }
      lines = parsed.validLines;
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "Business keyword and location are required." },
        { status: 422 }
      );
    }

    if (lines.length > settings.limits.maxLinesPerRun) {
      return NextResponse.json(
        { error: `Maximum of ${settings.limits.maxLinesPerRun} search lines allowed per run.` },
        { status: 422 }
      );
    }

    parsedParams = {
      lines,
      multi_line_input: rawMultiLine,
      keyword: lines[0]?.niche || "",
      location: lines[0]?.location || "",
      max_results: clampedMax,
      find_emails: body.find_emails ?? body.findEmails ?? true,
    };
  } else if (source === "meta_ads") {
    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    if (!keyword) {
      return NextResponse.json({ error: "Search keyword or niche is required." }, { status: 422 });
    }

    const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "US";

    parsedParams = {
      keyword,
      country,
      location: country,
      max_results: clampedMax,
      ad_status: body.ad_status === "all" ? "all" : "active",
    };
  } else if (source === "linkedin") {
    const titles = Array.isArray(body.titles)
      ? body.titles.filter((t: any) => typeof t === "string" && t.trim())
      : Array.isArray(body.jobTitles)
      ? body.jobTitles.filter((t: any) => typeof t === "string" && t.trim())
      : [];

    const keyword = typeof body.keyword === "string" ? body.keyword.trim() : "";
    const industry = typeof body.industry === "string" ? body.industry.trim() : undefined;
    const country = typeof body.country === "string" ? body.country.trim().toUpperCase() : "US";
    const state = typeof body.state === "string" ? body.state.trim() : undefined;
    const city = typeof body.city === "string" ? body.city.trim() : undefined;
    const location = typeof body.location === "string" && body.location.trim().toUpperCase() !== country
      ? body.location.trim()
      : (state ? `${city ? city + ", " : ""}${state}, ${country}` : undefined);
    const companyDescriptions = Array.isArray(body.company_descriptions)
      ? body.company_descriptions
      : Array.isArray(body.companyDescriptions)
      ? body.companyDescriptions
      : undefined;

    if (titles.length === 0 && !keyword && !industry && !state && !city) {
      return NextResponse.json(
        { error: "Please provide at least one Job Title, Industry, Keyword, or Location." },
        { status: 422 }
      );
    }

    const requireEmail = body.require_email !== undefined
      ? Boolean(body.require_email)
      : (body.requireEmail !== undefined ? Boolean(body.requireEmail) : true);

    parsedParams = {
      titles,
      keyword,
      industry,
      country,
      state,
      city,
      location,
      company_descriptions: companyDescriptions,
      seniority: Array.isArray(body.seniority) ? body.seniority : undefined,
      company_size: body.company_size || body.companySize || undefined,
      require_email: requireEmail,
      require_phone: Boolean(body.require_phone ?? body.requirePhone ?? false),
      max_results: clampedMax,
    };
  } else {
    return NextResponse.json({ error: `Unsupported lead source: ${source}` }, { status: 400 });
  }

  // Enforce tenant monthly lead quota
  try {
    await assertLimit(session.user.id, "monthly_leads", 1);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  // Create Search Job Record in Database
  const searchRecord = await db.lead_searches.create({
    data: {
      user_id: session.user.id,
      source,
      provider_used: "apify",
      params: parsedParams,
      status: "queued",
      progress_pct: 0,
      current_step: "Queued in lead search worker",
      started_at: new Date(),
    },
  });

  // Dispatch to BullMQ Queue & Trigger Async Execution
  queueLeadSearch(searchRecord.id).catch(() => {});
  executeLeadSearch(searchRecord.id).catch(() => {});

  return NextResponse.json({
    data: {
      searchId: searchRecord.id,
      status: "queued",
      progress_pct: 0,
      current_step: "Queued in lead search worker",
      max_results: parsedParams.max_results,
    },
  });
}
