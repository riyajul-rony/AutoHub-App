import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const searchId = searchParams.get("search_id") || undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 200);

  const leads = await db.leads.findMany({
    where: {
      user_id: session.user.id,
      search_id: searchId,
    },
    take: limit,
  });

  const total = await db.leads.count({
    where: {
      user_id: session.user.id,
      search_id: searchId,
    },
  });

  return NextResponse.json({
    data: {
      leads,
      total,
    },
  });
}
