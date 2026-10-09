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
