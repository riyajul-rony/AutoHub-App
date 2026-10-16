import { NextRequest, NextResponse } from "next/server";
import { getGoogleAuthUrl } from "@/server/integrations/google-sheets";

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("mode") || "connect";
  const defaultReturn = mode === "login" ? "/app" : "/app/leads/google_maps";
  const returnTo = req.nextUrl.searchParams.get("returnTo") || defaultReturn;
  const state = Buffer.from(JSON.stringify({ mode, returnTo })).toString("base64");

  const result = await getGoogleAuthUrl(state);
  if (result.error || !result.url) {
    if (mode === "login") {
      return NextResponse.redirect(new URL("/login?error=google_not_configured", req.nextUrl.origin));
    }
    return NextResponse.json({ error: result.error || "Google OAuth not configured" }, { status: 400 });
  }

  // If user requested json:
  if (req.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ url: result.url });
  }

  return NextResponse.redirect(result.url);
}
