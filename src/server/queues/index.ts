import { Queue } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@/server/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

let sharedConnection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!sharedConnection) {
    sharedConnection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    sharedConnection.on("error", (err) => {
      logger.warn({ err }, "Redis connection error (worker/queue degraded until connected)");
    });
  }
  return sharedConnection;
}

export const QUEUE_NAMES = {
  PLANNER: "planner",
  SOCIAL_PUBLISH: "social-publish",
  LEAD_SEARCH: "lead-search",
  LEAD_ENRICH: "lead-enrich",
  EMAIL_DISPATCH: "email-dispatch",
  EMAIL_SEND: "email-send",
  REPLY_POLL: "reply-poll",
  MAINTENANCE: "maintenance",
} as const;

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100,
    },
  });
}

let socialPublishQueue: Queue | null = null;
export function getSocialPublishQueue(): Queue {
  if (!socialPublishQueue) {
    socialPublishQueue = createQueue(QUEUE_NAMES.SOCIAL_PUBLISH);
  }
  return socialPublishQueue;
}

export async function queueSocialPublish(postRunId: string): Promise<boolean> {
  try {
    const queue = getSocialPublishQueue();
    await queue.add(
      "publish",
      { postRunId },
      {
        jobId: postRunId,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      }
    );
    return true;
  } catch (err) {
    logger.warn({ err, postRunId }, "Failed to enqueue social publish job to Redis BullMQ");
    return false;
  }
}

