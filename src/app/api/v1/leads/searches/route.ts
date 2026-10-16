import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searches = await db.lead_searches.findMany({
    where: {
      user_id: session.user.id,
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    data: {
      searches,
    },
  });
}
