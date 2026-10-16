import { db } from "@/server/db";
import { getEffectiveLimits } from "@/server/billing/limits";
import { cacheSet } from "@/server/cache";
import { logger } from "@/server/logger";

export type TrackableResource =
  | "monthly_leads"
  | "monthly_social_posts"
  | "monthly_outreach_emails";

export const RESOURCE_DISPLAY_NAMES: Record<TrackableResource, string> = {
  monthly_leads: "Monthly Leads",
  monthly_social_posts: "Monthly Social Posts",
  monthly_outreach_emails: "Monthly Outreach Emails",
};

/**
 * Returns current period string in YYYY-MM format (UTC).
 */
export function getCurrentMonthPeriod(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Atomic increment of resource usage counters.
 * Runs non-blocking to prevent adding latency to core requests.
 */
export async function trackUsageIncrement(
  userId: string,
  resource: TrackableResource,
  quantity: number = 1
): Promise<{ quantity: number; period: string }> {
  if (quantity <= 0) {
    return { quantity: 0, period: getCurrentMonthPeriod() };
  }

  const period = getCurrentMonthPeriod();

  try {
    // 1. Atomic update in Database
    const counter = await db.usage_counters.upsert({
      where: {
        user_id_resource_period: {
          user_id: userId,
          resource,
          period,
        },
      },
      create: {
        user_id: userId,
        resource,
        period,
        quantity,
      },
      update: {
        quantity: {
          increment: quantity,
        },
      },
    });

    const newTotal = Number(counter?.quantity || quantity);

    // 2. Sync to Redis for instant reads
    const cacheKey = `usage:${userId}:${period}:${resource}`;
    try {
      await cacheSet(cacheKey, newTotal, 86400 * 35); // 35 days TTL
    } catch {}

    // 3. Evaluate 80% & 100% threshold notifications asynchronously
    checkUsageThresholds(userId, resource, newTotal, period).catch((err) => {
      logger.warn({ userId, resource, err: err?.message }, "Failed to evaluate usage notification thresholds");
    });

    return { quantity: newTotal, period };
  } catch (err: any) {
    logger.error({ userId, resource, quantity, err: err.message }, "Error incrementing usage counter");
    return { quantity, period };
  }
}

/**
 * Evaluates whether user has crossed 80% or 100% of their quota and dispatches in-app notification.
 * Guaranteed at most 1 alert per threshold per resource per monthly period.
 */
export async function checkUsageThresholds(
  userId: string,
  resource: TrackableResource,
  currentUsage: number,
  period: string
) {
  const effective = await getEffectiveLimits(userId);
  const limit = effective[resource];

  // Unlimited or no limit configured
  if (limit <= 0 || limit >= 999999) {
    return;
  }

  const resourceName = RESOURCE_DISPLAY_NAMES[resource] || resource;
  const ratio = currentUsage / limit;

  // 1. Check 100% exhaustion threshold
  if (ratio >= 1.0) {
    const dedupeType = `quota_exhausted_100_${resource}_${period}`;
    const alreadyNotified = await db.notifications.findFirst({
      where: {
        user_id: userId,
        type: dedupeType,
      },
    }).catch(() => null);

    if (!alreadyNotified) {
      await db.notifications.create({
        data: {
          user_id: userId,
          type: dedupeType,
          title: `🚫 100% ${resourceName} Limit Reached`,
          body: `You have consumed all ${limit.toLocaleString()} ${resourceName.toLowerCase()} allocated for ${period}. Additional requests will be paused until next month or a plan upgrade.`,
          entity_type: "plan_limit",
          entity_id: resource,
        },
      }).catch(() => null);

      await db.activity_logs.create({
        data: {
          user_id: userId,
          type: "quota.exhausted_100",
          message: `User exhausted 100% of ${resourceName} quota (${currentUsage}/${limit}) for ${period}.`,
          meta: { resource, limit, currentUsage, period },
        },
      }).catch(() => null);
    }
    return;
  }

  // 2. Check 80% warning threshold
  if (ratio >= 0.8) {
    const dedupeType = `quota_warning_80_${resource}_${period}`;
    const alreadyNotified = await db.notifications.findFirst({
      where: {
        user_id: userId,
        type: dedupeType,
      },
    }).catch(() => null);

    if (!alreadyNotified) {
      await db.notifications.create({
        data: {
          user_id: userId,
          type: dedupeType,
          title: `⚠️ 80% ${resourceName} Limit Used`,
          body: `You have consumed ${currentUsage.toLocaleString()} of your ${limit.toLocaleString()} monthly ${resourceName.toLowerCase()} (${Math.round(ratio * 100)}%).`,
          entity_type: "plan_limit",
          entity_id: resource,
        },
      }).catch(() => null);

      await db.activity_logs.create({
        data: {
          user_id: userId,
          type: "quota.warning_80",
          message: `User reached 80% of ${resourceName} quota (${currentUsage}/${limit}) for ${period}.`,
          meta: { resource, limit, currentUsage, period },
        },
      }).catch(() => null);
    }
  }
}

/**
 * Fetch all usage counters for a user for a specific period.
 */
export async function getUserPeriodUsage(
  userId: string,
  period: string = getCurrentMonthPeriod()
): Promise<Record<TrackableResource, number>> {
  const result: Record<TrackableResource, number> = {
    monthly_leads: 0,
    monthly_social_posts: 0,
    monthly_outreach_emails: 0,
  };

  const records = await db.usage_counters.findMany({
    where: {
      user_id: userId,
      period,
    },
  });

  for (const r of records) {
    if (r.resource in result) {
      result[r.resource as TrackableResource] = Number(r.quantity || 0);
    }
  }

  return result;
}

/**
 * Monthly maintenance cleanup: deletes usage counter rows older than 12 months.
 */
export async function resetOrArchiveOldUsageCounters(): Promise<{ deleted: number }> {
  const now = new Date();
  const cutoffDate = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
  const cutoffPeriod = getCurrentMonthPeriod(cutoffDate);

  const res = await db.usage_counters.deleteMany({
    where: {
      period: { lt: cutoffPeriod },
    },
  });

  return { deleted: res.count || 0 };
}
