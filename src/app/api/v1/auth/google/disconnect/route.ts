import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { disconnectGoogle } from "@/server/integrations/google-sheets";

export async function POST() {
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

  await disconnectGoogle(session.user.id);
  return NextResponse.json({ success: true, message: "Google Account disconnected" });
}
