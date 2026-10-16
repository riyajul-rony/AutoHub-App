import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

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
    where: {
      id,
      user_id: session.user.id,
    },
  });

  if (!search) {
    return NextResponse.json({ error: "Search not found" }, { status: 404 });
  }

  const leads = await db.leads.findMany({
    where: {
      search_id: id,
      user_id: session.user.id,
    },
  });

  return NextResponse.json({
    data: {
      search,
      leads,
    },
  });
}
