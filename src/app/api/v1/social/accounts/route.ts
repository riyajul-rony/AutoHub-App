import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { assertLimit } from "@/server/billing/limits";

export async function GET() {
  const session = await getSessionUser();
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
  const session = await getSessionUser();
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

  // Check limits if adding a brand new social account
  const existing = await db.social_accounts.findFirst({
    where: {
      user_id: session.user.id,
      provider: provider as any,
      external_id: String(external_id).trim(),
    },
  });

  if (!existing) {
    try {
      await assertLimit(session.user.id, "max_social_accounts", 1);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
  }

  const cleanToken = access_token ? String(access_token).trim() : `token_${Date.now()}`;
  const encryptedToken = encrypt(cleanToken);

  const saved = await db.social_accounts.upsert({
    where: {
      user_id_provider_external_id: {
        user_id: session.user.id,
        provider: provider as any,
        external_id: String(external_id).trim(),
      },
    },
    create: {
      user_id: session.user.id,
      provider: provider as any,
      external_id: String(external_id).trim(),
      display_name: String(display_name).trim(),
      picture_url: picture_url || null,
      access_token_enc: encryptedToken,
      scopes: ["publish_posts"],
      status: "active",
    },
    update: {
      display_name: String(display_name).trim(),
      picture_url: picture_url || null,
      access_token_enc: encryptedToken,
      status: "active",
      last_error: null,
      updated_at: new Date(),
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
