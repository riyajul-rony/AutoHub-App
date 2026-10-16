import { db } from "@/server/db";
import { logger } from "@/server/logger";

/**
 * Automatically purges logs older than retention period (default: 90 days).
 */
export async function cleanupOldLogs(retentionDays: number = 90): Promise<{
  activityLogsDeleted: number;
  auditLogsDeleted: number;
  errorLogsDeleted: number;
}> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  let activityLogsDeleted = 0;
  let auditLogsDeleted = 0;
  let errorLogsDeleted = 0;

  try {
    const res = await db.activity_logs.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    activityLogsDeleted = res?.count || 0;
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Failed to purge old activity_logs");
  }

  try {
    const res = await db.admin_audit_logs.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    auditLogsDeleted = res?.count || 0;
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Failed to purge old admin_audit_logs");
  }

  try {
    const res = await db.error_logs.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    errorLogsDeleted = res?.count || 0;
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Failed to purge old error_logs");
  }

  logger.info(
    { retentionDays, cutoff: cutoff.toISOString(), activityLogsDeleted, auditLogsDeleted, errorLogsDeleted },
    "90-day logs cleanup completed"
  );

  return { activityLogsDeleted, auditLogsDeleted, errorLogsDeleted };
}
