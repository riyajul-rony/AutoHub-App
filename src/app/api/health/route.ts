import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { getRedisConnection } from "@/server/queues";

export async function GET() {
  let dbOk = false;
  let redisOk = false;
  let dbLatency = 0;

  // 1. Check PostgreSQL
  const dbStart = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
    dbLatency = Date.now() - dbStart;
  } catch (err: any) {
    console.error("[Healthcheck] PostgreSQL check failed:", err?.message || err);
    dbOk = false;
  }

  // 2. Check Redis
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch (err: any) {
    console.error("[Healthcheck] Redis check failed:", err?.message || err);
    redisOk = false;
  }

  const allHealthy = dbOk && redisOk;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      components: {
        database: { status: dbOk ? "up" : "down", latencyMs: dbLatency },
        redis: { status: redisOk ? "up" : "down" },
      },
    },
    { status: allHealthy ? 200 : 503 }
  );
}
