import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("leadreach_session")?.value || request.cookies.get("autohub_session")?.value;

  // Protected paths that require authentication
  const isAppPath = pathname.startsWith("/app");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isAdminPath = pathname.startsWith("/admin");

  if ((isAppPath || isOnboarding || isAdminPath) && !sessionToken) {
    const proto = request.headers.get("x-forwarded-proto") || (request.url.startsWith("https") ? "https" : "http");
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    const baseUrl = process.env.APP_URL || `${proto}://${host}`;
    const loginUrl = new URL("/login", baseUrl);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
  ],
};
