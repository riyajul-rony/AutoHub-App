import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { testApifyConnection } from "@/server/providers/leads/apify/client";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const key = await db.apify_keys.findUnique({
      where: { id },
    });

    if (!key) {
      return NextResponse.json({ error: "Apify key not found." }, { status: 404 });
    }

    let token: string;
    try {
      token = decrypt(key.token_enc).trim();
    } catch (err: any) {
      await db.apify_keys.update({
        where: { id },
        data: {
          status: "disabled",
          last_error: "Decryption failed: master key mismatch",
          last_tested_at: new Date(),
        },
      });
      return NextResponse.json({
        data: {
          ok: false,
          error: `Decryption failed: ${err?.message || "APP_ENCRYPTION_KEY could not decrypt this token."}`,
        },
      });
    }

    const testRes = await testApifyConnection(token);

    if (testRes.ok) {
      await db.apify_keys.update({
        where: { id },
        data: {
          status: "active",
          cooldown_until: null,
          last_error: null,
          last_tested_at: new Date(),
          last_test_result: {
            username: testRes.username || null,
            plan: testRes.plan || null,
            ok: true,
          },
        },
      });
    } else {
      await db.apify_keys.update({
        where: { id },
        data: {
          last_error: testRes.error || "Connection test failed",
          last_tested_at: new Date(),
          last_test_result: {
            ok: false,
            error: testRes.error,
          },
        },
      });
    }

    return NextResponse.json({
      data: testRes,
    });
  } catch (err: any) {
    logger.error({ id, err: err?.message }, "[Apify Key Pool API] Error testing key");
    return NextResponse.json({ error: `Failed to test key connection: ${err?.message || "Internal error"}` }, { status: 500 });
  }
}
