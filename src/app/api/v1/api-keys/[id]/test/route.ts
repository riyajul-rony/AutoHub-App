import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { testOpenAiKey } from "@/server/ai/tester";

export async function POST(
  _: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const keyRecord = await db.api_keys.findFirst({
    where: scoped(session.user.id, { id }),
  });

  if (!keyRecord) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const plaintextKey = decrypt(keyRecord.key_enc);
  const testRes = await testOpenAiKey(plaintextKey);

  const updated = await db.api_keys.update({
    where: { id: keyRecord.id },
    data: {
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
    data: updated,
    success: testRes.ok,
    error: testRes.error,
  });
}
