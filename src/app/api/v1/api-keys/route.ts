import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { encrypt, last4 } from "@/server/crypto";
import { apiKeyInputSchema } from "@/server/api-keys/types";
import { testOpenAiKey } from "@/server/ai/tester";
import { testBrightDataKey } from "@/server/api-keys/bright-data-tester";

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

  // Test the key connection before saving
  let testRes: { ok: boolean; error?: string };
  if (provider === "bright_data") {
    testRes = await testBrightDataKey(key);
  } else {
    testRes = await testOpenAiKey(key);
  }

  const created = await db.api_keys.create({
    data: {
      user_id: session.user.id,
      provider,
      label,
      key_enc: encrypt(key),
      key_last4: last4(key),
      last_tested_at: new Date(),
      last_test_ok: testRes.ok,
      status: testRes.ok ? "active" : "invalid",
    },
    select: {
      id: true,
      provider: true,
      label: true,
      key_last4: true,
      status: true,
      last_tested_at: true,
      last_test_ok: true,
      created_at: true,
    },
  });

  return NextResponse.json({
    data: created,
    test_error: testRes.error,
  });
}
