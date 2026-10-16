import { NextResponse } from "next/server";
import { getScrapeQueueStatus } from "@/server/providers/leads/google-maps";

export async function GET() {
  const status = getScrapeQueueStatus();
  return NextResponse.json({
    status: status.isBusy ? "busy" : "idle",
    queued: status.queuedCount,
  });
}
