import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { getApifyConfigStatus, getApifySettings } from "@/server/providers/leads/apify/config";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = hasPermission(session.user.role, "settings.manage");
  const [status, settings] = await Promise.all([
    getApifyConfigStatus(),
    getApifySettings(),
  ]);

  logger.info(
    {
      userId: session.user.id,
      isAdmin,
      configured: status.configured,
      reason: status.reason,
    },
    "[Apify Status API] Status check evaluated"
  );

  const payload: Record<string, any> = {
    configured: status.configured,
    google_maps_provider: settings.google_maps_provider || "compass",
    limits: settings.limits,
    unitPrices: settings.unitPrices,
  };

  // Only expose diagnostic reason codes and last test details to administrators
  if (isAdmin) {
    payload.reason = status.reason;
    payload.lastTest = status.lastTest || null;
  }

  return NextResponse.json({
    data: payload,
    ...payload,
  });
}
