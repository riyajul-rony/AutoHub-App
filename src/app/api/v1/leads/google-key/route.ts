import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  getPlacesKeyStatus,
  savePlacesKey,
  deletePlacesKey,
  testPlacesKey,
  looksLikeGoogleKey,
} from "@/server/providers/leads/places-key";

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

  const status = await getPlacesKeyStatus(session.user.id);
  return NextResponse.json({ data: status });
}

export async function POST(req: NextRequest) {
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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { apiKey } = body || {};
  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API key is required" }, { status: 422 });
  }

  const clean = apiKey.trim();
  if (!looksLikeGoogleKey(clean)) {
    return NextResponse.json(
      { error: "Invalid Google API key format. A valid Google API key usually begins with 'AIza'." },
      { status: 422 }
    );
  }

  // Test the key against Google Places API (New)
  const testRes = await testPlacesKey(clean);
  if (!testRes.ok) {
    return NextResponse.json(
      { error: testRes.error || "Google Places API key verification failed." },
      { status: 400 }
    );
  }

  const saved = await savePlacesKey(session.user.id, clean);
  return NextResponse.json({
    data: saved,
    message: "Google Places API key verified and connected successfully!",
  });
}

export async function DELETE() {
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

  await deletePlacesKey(session.user.id);
  return NextResponse.json({ success: true, message: "Google Places API key disconnected." });
}
