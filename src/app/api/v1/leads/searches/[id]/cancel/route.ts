import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";

export async function POST(
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
    return NextResponse.json({ error: "Search record not found" }, { status: 404 });
  }

  if (search.status === "completed" || search.status === "failed") {
    return NextResponse.json(
      { error: `Cannot cancel a search that is already ${search.status}` },
      { status: 400 }
    );
  }

  const updated = await db.lead_searches.update({
    where: { id },
    data: {
      status: "cancelled",
      current_step: "Search cancelled by user",
      finished_at: new Date(),
    },
    select: {
      id: true,
      status: true,
      current_step: true,
      progress_pct: true,
    },
  });

  return NextResponse.json({
    ok: true,
    data: updated,
  });
}
