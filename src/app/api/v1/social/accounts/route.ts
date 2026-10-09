import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { encrypt } from "@/server/crypto";

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

  const rawAccounts = await db.social_accounts.findMany({
    where: scoped(session.user.id),
  });

  const safeAccounts = (rawAccounts || []).map((acc: any) => ({
    id: acc.id,
    provider: acc.provider,
    external_id: acc.external_id,
    display_name: acc.display_name,
    picture_url: acc.picture_url,
    status: acc.status || "active",
    created_at: acc.created_at,
  }));

  return NextResponse.json({ data: safeAccounts });
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

  const { provider, external_id, display_name, access_token, picture_url } = body;

  if (!provider || !["facebook", "instagram", "linkedin"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider. Must be facebook, instagram, or linkedin." }, { status: 400 });
  }

  if (!external_id || !display_name) {
    return NextResponse.json({ error: "External ID (Page ID / Account ID) and Display Name are required." }, { status: 400 });
  }

  const cleanToken = access_token ? String(access_token).trim() : `token_${Date.now()}`;
  const encryptedToken = encrypt(cleanToken);

  const saved = await db.social_accounts.create({
    data: {
      user_id: session.user.id,
      provider: provider as any,
      external_id: String(external_id).trim(),
      display_name: String(display_name).trim(),
      picture_url: picture_url || null,
      access_token_enc: encryptedToken,
      scopes: ["publish_posts"],
      status: "active",
    },
  });

  return NextResponse.json({
    data: {
      id: saved.id,
      provider: saved.provider,
      external_id: saved.external_id,
      display_name: saved.display_name,
      status: saved.status,
    },
  });
}
