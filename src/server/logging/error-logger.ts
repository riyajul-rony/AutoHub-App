import { db } from "@/server/db";
import { logger } from "@/server/logger";

export interface RecordErrorLogParams {
  source: string; // e.g. "worker:social_publish", "worker:email_send", "worker:planner", "api:billing"
  message: string;
  stack?: string | null;
  context?: Record<string, any> | null;
  userId?: string | null;
}

/**
 * Persists an error into the error_logs table so it can be monitored in /admin/logs.
 * Non-blocking: fail-safe execution so that logging failures never crash workers.
 */
export async function recordErrorLog(params: RecordErrorLogParams): Promise<void> {
  try {
    await db.error_logs.create({
      data: {
        source: params.source,
        message: params.message.slice(0, 2000),
        stack: params.stack ? params.stack.slice(0, 8000) : null,
        context: params.context || undefined,
        user_id: params.userId || null,
      },
    });
  } catch (err: any) {
    logger.warn({ err: err?.message, source: params.source }, "Failed to persist error to error_logs table");
  }
}
