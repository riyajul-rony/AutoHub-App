import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { testApifyConnection } from "@/server/providers/leads/apify/client";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json(
      { error: "Forbidden: settings.manage permission required" },
      { status: 403 }
    );
  }

  let body: any = {};
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const tokenToTest = typeof body.token === "string" && body.token.trim().length > 0
    ? body.token.trim()
    : undefined;

  const result = await testApifyConnection(tokenToTest);

  return NextResponse.json({
    data: result,
  });
}
