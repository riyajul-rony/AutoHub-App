import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getGoogleConnectionStatus } from "@/server/integrations/google-sheets";

export async function GET() {
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

  const status = await getGoogleConnectionStatus(session.user.id);
  return NextResponse.json({ data: status });
}
