import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import { logger } from "@/server/logger";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateKeySchema = z.object({
  label: z.string().trim().min(1).max(60).optional(),
  status: z.enum(["active", "disabled", "cooldown"]).optional(),
  max_concurrent_jobs: z.coerce.number().int().min(1).max(10).optional(),
  clearCooldown: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = updateKeySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input parameters." },
      { status: 422 }
    );
  }

  try {
    const existing = await db.apify_keys.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Apify key not found." }, { status: 404 });
    }

    const updateData: any = {};
    if (parsed.data.label) updateData.label = parsed.data.label;
    if (parsed.data.max_concurrent_jobs) updateData.max_concurrent_jobs = parsed.data.max_concurrent_jobs;
    if (parsed.data.status) updateData.status = parsed.data.status;

    if (parsed.data.clearCooldown) {
      updateData.status = "active";
      updateData.cooldown_until = null;
      updateData.last_error_reason = null;
    }

    const updated = await db.apify_keys.update({
      where: { id },
      data: updateData,
    });

    await recordAuditLog({
      adminId: session.user.id,
      action: "apify_key.update",
      targetType: "apify_key",
      targetId: id,
      afterState: updateData,
    }).catch(() => {});

    return NextResponse.json({
      data: {
        id: updated.id,
        label: updated.label,
        token_last4: updated.token_last4,
        masked_token: `••••${updated.token_last4}`,
        account_email: updated.account_email,
        plan_name: updated.plan_name,
        status: updated.status,
        max_concurrent_jobs: updated.max_concurrent_jobs,
        cooldown_until: updated.cooldown_until ? new Date(updated.cooldown_until).toISOString() : null,
        last_error_reason: updated.last_error_reason,
        total_runs: updated.total_runs,
        total_cost_usd: Number(updated.total_cost_usd) || 0,
      },
      message: `Key "${updated.label}" updated successfully.`,
    });
  } catch (err: any) {
    logger.error({ id, err: err?.message }, "[Apify Key Pool API] Error updating key");
    return NextResponse.json({ error: "Failed to update key." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const existing = await db.apify_keys.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Apify key not found." }, { status: 404 });
    }

    await db.apify_keys.delete({
      where: { id },
    });

    await recordAuditLog({
      adminId: session.user.id,
      action: "apify_key.delete",
      targetType: "apify_key",
      targetId: id,
      afterState: { label: existing.label, token_last4: existing.token_last4 },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: `Key "${existing.label}" deleted from pool.`,
    });
  } catch (err: any) {
    logger.error({ id, err: err?.message }, "[Apify Key Pool API] Error deleting key");
    return NextResponse.json({ error: "Failed to delete key." }, { status: 500 });
  }
}
