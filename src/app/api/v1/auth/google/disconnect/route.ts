import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { disconnectGoogle } from "@/server/integrations/google-sheets";

export async function POST() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogle(session.user.id);
  return NextResponse.json({ success: true, message: "Google Account disconnected" });
}
