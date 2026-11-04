import { Queue, Job } from "bullmq";
import { createQueue, QUEUE_NAMES, getRedisConnection } from "@/server/queues";
import { db } from "@/server/db";
import { logger } from "@/server/logger";

const queueInstances = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queueInstances.has(name)) {
    queueInstances.set(name, createQueue(name));
  }
  return queueInstances.get(name)!;
}

/**
 * Check if Redis connection is responsive with a tight timeout to prevent blocking SSR.
 */
async function isRedisOnline(timeoutMs = 600): Promise<boolean> {
  try {
    const redis = getRedisConnection();
    if (redis.status === "ready") return true;
    return await Promise.race([
      redis.ping().then((res) => res === "PONG").catch(() => false),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), timeoutMs)),
    ]);
  } catch {
    return false;
  }
}

export interface QueueOverview {
  name: string;
  displayName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  isPaused: boolean;
}

export interface FailedJobItem {
  id: string;
  queueName: string;
  name: string;
  failedReason?: string;
  stacktrace?: string[];
  timestamp: number;
  attemptsMade: number;
  userId?: string;
  userName?: string;
  userEmail?: string;
  data: any;
}

const DISPLAY_NAMES: Record<string, string> = {
  [QUEUE_NAMES.PLANNER]: "Social Planner",
  [QUEUE_NAMES.SOCIAL_PUBLISH]: "Social Media Publisher",
  [QUEUE_NAMES.LEAD_SEARCH]: "Google Maps Lead Search",
  [QUEUE_NAMES.LEAD_ENRICH]: "Lead Enrichment",
  [QUEUE_NAMES.EMAIL_DISPATCH]: "Campaign Email Dispatch",
  [QUEUE_NAMES.EMAIL_SEND]: "SMTP / Gmail Sending",
  [QUEUE_NAMES.REPLY_POLL]: "IMAP Reply Poller",
  [QUEUE_NAMES.MAINTENANCE]: "System Maintenance & Cleanup",
};

/**
 * Fetch status counts for all BullMQ queues.
 * Fail-safe: Returns zeros if Redis is offline or degraded.
 */
export async function getAllQueuesOverview(): Promise<{
  queues: QueueOverview[];
  redisOnline: boolean;
}> {
  const names = Object.values(QUEUE_NAMES);
  const online = await isRedisOnline(600);

  if (!online) {
    return {
      redisOnline: false,
      queues: names.map((name) => ({
        name,
        displayName: DISPLAY_NAMES[name] || name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        isPaused: false,
      })),
    };
  }

  const result: QueueOverview[] = [];

  for (const name of names) {
    try {
      const q = getQueue(name);
      const [counts, isPaused] = await Promise.race([
        Promise.all([
          (q as any).getJobCounts("waiting", "active", "completed", "failed", "delayed", "paused"),
          q.isPaused().catch(() => false),
        ]),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000)),
      ]);

      result.push({
        name,
        displayName: DISPLAY_NAMES[name] || name,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
        isPaused,
      });
    } catch (err: any) {
      result.push({
        name,
        displayName: DISPLAY_NAMES[name] || name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: 0,
        isPaused: false,
      });
    }
  }

  return { queues: result, redisOnline: true };
}

/**
 * Fetch list of failed jobs across specified queue or all queues.
 */
export async function getFailedJobs(queueName?: string, limit = 50): Promise<FailedJobItem[]> {
  const online = await isRedisOnline(600);
  if (!online) return [];

  const targets = queueName ? [queueName] : Object.values(QUEUE_NAMES);
  const items: FailedJobItem[] = [];

  for (const name of targets) {
    try {
      const q = getQueue(name);
      const jobs: Job[] = await Promise.race([
        q.getJobs(["failed"], 0, limit),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000)),
      ]);

      for (const j of jobs) {
        if (!j) continue;
        const jobData = j.data || {};
        const userId = jobData.userId || jobData.user_id || undefined;

        items.push({
          id: String(j.id || ""),
          queueName: name,
          name: j.name || "default",
          failedReason: j.failedReason || "Unknown failure",
          stacktrace: j.stacktrace || [],
          timestamp: j.timestamp || Date.now(),
          attemptsMade: j.attemptsMade || 0,
          userId,
          data: jobData,
        });
      }
    } catch (err: any) {
      logger.warn({ queue: name, err: err.message }, "Failed to fetch failed jobs from queue");
    }
  }

  // Enrich with user names if userId found
  const userIds = Array.from(new Set(items.map((i) => i.userId).filter(Boolean))) as string[];
  if (userIds.length > 0) {
    try {
      const users: any[] = await db.users.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      const userMap = new Map<string, any>(users.map((u: any) => [u.id, u]));
      for (const item of items) {
        if (item.userId && userMap.has(item.userId)) {
          const u = userMap.get(item.userId);
          item.userName = u?.name || undefined;
          item.userEmail = u?.email;
        }
      }
    } catch {}
  }

  // Sort newest first
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Retry a failed job.
 */
export async function retryJob(queueName: string, jobId: string): Promise<boolean> {
  const q = getQueue(queueName);
  const job = await q.getJob(jobId);
  if (!job) throw new Error("Job not found in queue");
  await job.retry();
  return true;
}

/**
 * Remove a job from the queue.
 */
export async function removeJob(queueName: string, jobId: string): Promise<boolean> {
  const q = getQueue(queueName);
  const job = await q.getJob(jobId);
  if (!job) return true;
  await job.remove();
  return true;
}

/**
 * Pause a queue.
 */
export async function pauseQueue(queueName: string): Promise<boolean> {
  const q = getQueue(queueName);
  await q.pause();
  return true;
}

/**
 * Resume a paused queue.
 */
export async function resumeQueue(queueName: string): Promise<boolean> {
  const q = getQueue(queueName);
  await q.resume();
  return true;
}

/**
 * Attempt to remove any active, waiting, or delayed BullMQ jobs associated with a user.
 * Fails safely if Redis is offline or jobs are already completed.
 */
export async function cancelUserJobs(userId: string): Promise<void> {
  const online = await isRedisOnline(600);
  if (!online) return;

  const names = Object.values(QUEUE_NAMES);
  for (const name of names) {
    try {
      const q = getQueue(name);
      const jobs: Job[] = await Promise.race([
        q.getJobs(["waiting", "delayed", "active"], 0, 100),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 1000)),
      ]);

      for (const j of jobs) {
        if (!j) continue;
        const jobData = j.data || {};
        if (jobData.userId === userId || jobData.user_id === userId) {
          await j.remove().catch(() => null);
        }
      }
    } catch (err: any) {
      logger.warn({ queue: name, userId, err: err?.message }, "Failed to cancel user jobs in BullMQ queue");
    }
  }
}
