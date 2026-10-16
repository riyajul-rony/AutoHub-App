import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getGoogleConnectionStatus } from "@/server/integrations/google-sheets";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getGoogleConnectionStatus(session.user.id);
  return NextResponse.json({ data: status });
}
