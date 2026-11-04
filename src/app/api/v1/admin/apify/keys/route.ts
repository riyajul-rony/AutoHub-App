import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { testApifyConnection } from "@/server/providers/leads/apify/client";
import { getRedisConnection } from "@/server/queues";
import { recordAuditLog } from "@/server/audit";
import { logger } from "@/server/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const addKeySchema = z.object({
  label: z.string().trim().min(1, "Label is required").max(60),
  token: z.string().trim().min(5, "Valid Apify token is required"),
  max_concurrent_jobs: z.coerce.number().int().min(1).max(10).default(2),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  try {
    const keys = await db.apify_keys.findMany({
      orderBy: { created_at: "desc" },
    });

    // Fetch live in-flight job counts from Redis
    const keysWithInflight = await Promise.all(
      keys.map(async (k: any) => {
        let inflight = 0;
        try {
          const redis = getRedisConnection();
          if (redis.status === "ready" || redis.status === "connecting") {
            const raw = await redis.get(`apify:key:${k.id}:inflight`);
            inflight = raw ? parseInt(raw, 10) : 0;
          }
        } catch {}

        const testResult = (k.last_test_result as any) || {};

        return {
          id: k.id,
          label: k.label,
          token_last4: k.masked_token ? k.masked_token.slice(-4) : "••••",
          masked_token: k.masked_token,
          account_email: testResult.username || null,
          plan_name: testResult.plan || null,
          status: k.status,
          max_concurrent_jobs: k.max_concurrent_jobs,
          in_flight_jobs: inflight,
          cooldown_until: k.cooldown_until ? new Date(k.cooldown_until).toISOString() : null,
          last_error_reason: k.last_error,
          last_used_at: k.last_used_at ? new Date(k.last_used_at).toISOString() : null,
          total_runs: k.total_runs_all_time || 0,
          total_cost_usd: 0,
          created_at: new Date(k.created_at).toISOString(),
        };
      })
    );

    return NextResponse.json({
      data: keysWithInflight,
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "[Apify Key Pool API] Error listing keys");
    return NextResponse.json({ error: `Failed to load Apify keys: ${err?.message || "Internal error"}` }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = addKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input parameters." },
      { status: 422 }
    );
  }

  const { label, token, max_concurrent_jobs } = parsed.data;

  // 1. Test the key against Apify API first
  const testRes = await testApifyConnection(token);
  if (!testRes.ok) {
    return NextResponse.json(
      { error: `Token validation failed: ${testRes.error}` },
      { status: 422 }
    );
  }

  // 2. Encrypt token using AES-256-GCM
  let token_enc: string;
  try {
    token_enc = encrypt(token);
  } catch (encErr: any) {
    logger.error({ err: encErr?.message }, "[Apify Key Pool] Encryption failure");
    return NextResponse.json(
      { error: `Encryption error: ${encErr?.message || "Invalid encryption key. Check APP_ENCRYPTION_KEY."}` },
      { status: 500 }
    );
  }

  const token_last4 = token.slice(-4);
  const masked_token = `••••${token_last4}`;

  // 3. Save into Database
  try {
    const created = await db.apify_keys.create({
      data: {
        label,
        token_enc,
        masked_token,
        status: "active",
        max_concurrent_jobs,
        last_tested_at: new Date(),
        last_test_result: {
          username: testRes.username || null,
          plan: testRes.plan || null,
          ok: true,
        },
        last_error: null,
      },
    });

    await recordAuditLog({
      adminId: session.user.id,
      action: "apify_key.create",
      targetType: "apify_key",
      targetId: created.id,
      afterState: { label, token_last4, plan: testRes.plan },
    }).catch(() => {});

    return NextResponse.json({
      data: {
        id: created.id,
        label: created.label,
        token_last4,
        masked_token: created.masked_token,
        account_email: testRes.username || null,
        plan_name: testRes.plan || null,
        status: created.status,
        max_concurrent_jobs: created.max_concurrent_jobs,
        in_flight_jobs: 0,
        total_runs: 0,
        total_cost_usd: 0,
        created_at: new Date(created.created_at).toISOString(),
      },
      message: `Apify key "${label}" added successfully and verified with Apify.`,
    });
  } catch (err: any) {
    logger.error({ err: err?.message, code: err?.code }, "[Apify Key Pool API] Error creating key in database");
    return NextResponse.json(
      { error: `Database error: ${err?.message || "Failed to save key into pool."}` },
      { status: 500 }
    );
  }
}
