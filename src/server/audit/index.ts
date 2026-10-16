import { headers } from "next/headers";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

export interface RecordAuditLogParams {
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Record an administrative action into admin_audit_logs table.
 * Automatically extracts IP and User Agent from request headers if not provided.
 * Fail-safe: catches and warns on error so it never crashes the primary operation.
 */
export async function recordAuditLog(params: RecordAuditLogParams): Promise<void> {
  try {
    let clientIp = params.ipAddress;
    let clientUa = params.userAgent;

    if (!clientIp || !clientUa) {
      try {
        const h = await headers();
        if (!clientIp) {
          clientIp = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "127.0.0.1";
        }
        if (!clientUa) {
          clientUa = h.get("user-agent")?.slice(0, 500) || undefined;
        }
      } catch {
        // Headers might not be accessible outside of request context
      }
    }

    await db.admin_audit_logs.create({
      data: {
        admin_id: params.adminId,
        action: params.action,
        target_type: params.targetType,
        target_id: params.targetId || null,
        before_state: params.beforeState ? params.beforeState : undefined,
        after_state: params.afterState ? params.afterState : undefined,
        ip_address: clientIp || null,
        user_agent: clientUa || null,
      },
    });
  } catch (err: any) {
    logger.warn({ err: err?.message, action: params.action }, "[AuditLog] Failed to record admin audit log");
  }
}
