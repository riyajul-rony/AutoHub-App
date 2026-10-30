import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getApifySettings } from "@/server/providers/leads/apify/config";
import { getUserUsageAndLimits } from "@/server/billing/limits";

export const dynamic = "force-dynamic";

export const MAX_SAFETY_CEILING = 1000;

export async function GET() {
  const session = await getSessionUser();
  const settings = await getApifySettings();

  const adminLimits = {
    google_maps: Math.min(
      Math.max(Number(settings.limits.maxLeadsPerRun.google_maps) || 100, 1),
      MAX_SAFETY_CEILING
    ),
    meta_ads: Math.min(
      Math.max(Number(settings.limits.maxLeadsPerRun.meta_ads) || 200, 1),
      MAX_SAFETY_CEILING
    ),
    b2b_leads: Math.min(
      Math.max(Number(settings.limits.maxLeadsPerRun.b2b_leads) || 100, 1),
      MAX_SAFETY_CEILING
    ),
    ceiling: MAX_SAFETY_CEILING,
  };

  let userRemainingQuota: number | null = null;
  if (session?.user?.id) {
    try {
      const usage = await getUserUsageAndLimits(session.user.id);
      userRemainingQuota = usage.limits.monthly_leads.remaining;
    } catch {
      userRemainingQuota = null;
    }
  }

  return NextResponse.json({
    data: {
      limits: adminLimits,
      userRemainingQuota,
      safetyCeiling: MAX_SAFETY_CEILING,
    },
  });
}
