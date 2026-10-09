import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/server/integrations/google-sheets";

export async function GET(req: NextRequest) {
  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/app/leads/google_maps";
  const state = Buffer.from(JSON.stringify({ returnTo })).toString("base64");

  const result = await getGoogleAuthUrl(state);
  if (result.error || !result.url) {
    return NextResponse.json({ error: result.error || "Google OAuth not configured" }, { status: 400 });
  }

  // If user requested json:
  if (req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: result.url });
  }

  return NextResponse.redirect(result.url);
}
