import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { formatLeadRecord } from "@/server/providers/leads/formatter";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const search = await db.lead_searches.findFirst({
    where: scoped(session.user.id, { id }),
  });

  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  const rawLeads = await db.leads.findMany({
    where: scoped(session.user.id, { search_id: id }),
    orderBy: { collected_at: "desc" },
  });

  const locationHint =
    typeof search.params === "object" && search.params !== null
      ? (search.params as any).location || ""
      : "";

  const formattedLeads = rawLeads.map((l: any) => formatLeadRecord(l, locationHint));

  return NextResponse.json({
    data: {
      search: {
        id: search.id,
        source: search.source,
        status: search.status,
        progress_pct: search.progress_pct,
        current_step: search.current_step,
        found_count: search.found_count,
        enriched_count: search.enriched_count,
        duplicates_skipped: search.duplicates_skipped,
        error: search.error,
        started_at: search.started_at,
        finished_at: search.finished_at,
        created_at: search.created_at,
      },
      leads: formattedLeads,
      totalCount: formattedLeads.length,
    },
  });
}
