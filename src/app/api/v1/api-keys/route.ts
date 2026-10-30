import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { encrypt, last4 } from "@/server/crypto";
import { apiKeyInputSchema } from "@/server/api-keys/types";
import { testOpenAiKey } from "@/server/ai/tester";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await db.api_keys.findMany({
    where: scoped(session.user.id),
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      provider: true,
      label: true,
      key_last4: true,
      status: true,
      metadata: true,
      last_tested_at: true,
      last_test_ok: true,
      created_at: true,
    },
  });

  return NextResponse.json({ data: keys });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = apiKeyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 422 });
  }

  const { provider, label, key } = parsed.data;

  const cleanKey = key.trim();
  const testRes = await testOpenAiKey(cleanKey);
  const metadataToSave: Record<string, any> = {};

  if (!testRes.ok) {
    return NextResponse.json(
      {
        error: testRes.error || "Failed to verify API key connection.",
      },
      { status: 400 }
    );
  }

  const created = await db.api_keys.create({
    data: {
      user_id: session.user.id,
      provider,
      label,
      key_enc: encrypt(cleanKey),
      key_last4: last4(cleanKey),
      metadata: metadataToSave,
      last_tested_at: new Date(),
      last_test_ok: true,
      status: "active",
    },
    select: {
      id: true,
      provider: true,
      label: true,
      key_last4: true,
      status: true,
      metadata: true,
      last_tested_at: true,
      last_test_ok: true,
      created_at: true,
    },
  });

  return NextResponse.json({
    data: created,
  });
}
