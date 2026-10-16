"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/server/auth/session";
import { assertPermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { recordAuditLog } from "@/server/audit";
import { cleanupOldLogs } from "@/server/logging/cleaner";

export async function resolveErrorLogAction(logId: string) {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "logs.read");

  const existing = await db.error_logs.findUnique({ where: { id: logId } });
  if (!existing) throw new Error("Error log not found");

  await db.error_logs.update?.({
    where: { id: logId },
    data: { resolved_at: new Date() },
  });

  await recordAuditLog({
    adminId: session.user.id,
    action: "error_log.resolve",
    targetType: "error_log",
    targetId: logId,
    afterState: { resolved_at: new Date() },
  });

  revalidatePath("/admin/logs");
  return { success: true };
}

export async function runLogPurgeAction() {
  const session = await getSessionUser();
  if (!session) throw new Error("Unauthorized");
  assertPermission(session.user.role, "settings.manage");

  const result = await cleanupOldLogs(90);

  await recordAuditLog({
    adminId: session.user.id,
    action: "logs.retention_cleanup",
    targetType: "system_logs",
    afterState: result,
  });

  revalidatePath("/admin/logs");
  return { success: true, result };
}
