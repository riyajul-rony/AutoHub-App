"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guards";
import { retryJob, removeJob, pauseQueue, resumeQueue } from "@/server/queues/manager";
import { recordAuditLog } from "@/server/audit";

export async function retryJobAction(queueName: string, jobId: string) {
  const admin = await requirePermission("settings.manage");

  try {
    await retryJob(queueName, jobId);
    await recordAuditLog({
      adminId: admin.id,
      action: "queue.job_retried",
      targetType: "bullmq_job",
      targetId: jobId,
      afterState: { queueName, jobId },
    });
    revalidatePath("/admin/jobs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to retry job" };
  }
}

export async function removeJobAction(queueName: string, jobId: string) {
  const admin = await requirePermission("settings.manage");

  try {
    await removeJob(queueName, jobId);
    await recordAuditLog({
      adminId: admin.id,
      action: "queue.job_removed",
      targetType: "bullmq_job",
      targetId: jobId,
      afterState: { queueName, jobId },
    });
    revalidatePath("/admin/jobs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to remove job" };
  }
}

export async function toggleQueuePauseAction(queueName: string, shouldPause: boolean) {
  const admin = await requirePermission("settings.manage");

  try {
    if (shouldPause) {
      await pauseQueue(queueName);
    } else {
      await resumeQueue(queueName);
    }

    await recordAuditLog({
      adminId: admin.id,
      action: shouldPause ? "queue.paused" : "queue.resumed",
      targetType: "bullmq_queue",
      targetId: queueName,
      afterState: { queueName, isPaused: shouldPause },
    });

    revalidatePath("/admin/jobs");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to toggle queue pause state" };
  }
}
