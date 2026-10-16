import { db } from "@/server/db";

export type PlanLimitResource =
  | "monthly_leads"
  | "monthly_social_posts"
  | "monthly_outreach_emails"
  | "max_social_accounts"
  | "max_email_accounts"
  | "max_campaigns";

export interface PlanLimits {
  monthly_leads: number;
  monthly_social_posts: number;
  monthly_outreach_emails: number;
  max_social_accounts: number;
  max_email_accounts: number;
  max_campaigns: number;
}

export interface ResourceUsage {
  current: number;
  limit: number;
  remaining: number;
  percentage: number;
  isExceeded: boolean;
}

export interface UserUsageSummary {
  plan: {
    name: string;
    slug: string;
    description?: string | null;
    price_monthly: number;
    price_yearly: number;
    currency: string;
    features: string[];
  };
  limits: Record<PlanLimitResource, ResourceUsage>;
  overrides?: {
    monthly_leads?: number | null;
    monthly_social_posts?: number | null;
    monthly_outreach_emails?: number | null;
    max_social_accounts?: number | null;
    max_email_accounts?: number | null;
    max_campaigns?: number | null;
  } | null;
}

const DEFAULT_FREE_LIMITS: PlanLimits = {
  monthly_leads: 100,
  monthly_social_posts: 30,
  monthly_outreach_emails: 100,
  max_social_accounts: 2,
  max_email_accounts: 1,
  max_campaigns: 2,
};

const RESOURCE_LABELS: Record<PlanLimitResource, string> = {
  monthly_leads: "Monthly Leads",
  monthly_social_posts: "Monthly Social Posts",
  monthly_outreach_emails: "Monthly Outreach Emails",
  max_social_accounts: "Connected Social Accounts",
  max_email_accounts: "Connected Email Inboxes",
  max_campaigns: "Active Campaigns",
};

export interface EffectiveLimitsResult extends PlanLimits {
  planName: string;
  planSlug: string;
  planDescription: string | null;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  rawOverrides: {
    monthly_leads?: number | null;
    monthly_social_posts?: number | null;
    monthly_outreach_emails?: number | null;
    max_social_accounts?: number | null;
    max_email_accounts?: number | null;
    max_campaigns?: number | null;
  } | null;
}

/**
 * Resolve effective limits for a user by merging plan defaults with any custom overrides.
 */
export async function getEffectiveLimits(userId: string): Promise<EffectiveLimitsResult> {
  // 1. Fetch user to check plan identifier
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { plan: true, plan_id: true },
  });

  const planSlug = user?.plan || "free";

  // 2. Fetch plan record
  const plan = await db.plans.findUnique({
    where: { slug: planSlug },
  }).catch(() => null);

  const baseLimits: PlanLimits = plan
    ? {
        monthly_leads: Number(plan.monthly_leads),
        monthly_social_posts: Number(plan.monthly_social_posts),
        monthly_outreach_emails: Number(plan.monthly_outreach_emails),
        max_social_accounts: Number(plan.max_social_accounts),
        max_email_accounts: Number(plan.max_email_accounts),
        max_campaigns: Number(plan.max_campaigns),
      }
    : { ...DEFAULT_FREE_LIMITS };

  // 3. Fetch custom user limit overrides
  const overrides = await db.user_limit_overrides.findUnique({
    where: { user_id: userId },
  }).catch(() => null);

  return {
    monthly_leads: overrides?.monthly_leads != null ? overrides.monthly_leads : baseLimits.monthly_leads,
    monthly_social_posts: overrides?.monthly_social_posts != null ? overrides.monthly_social_posts : baseLimits.monthly_social_posts,
    monthly_outreach_emails: overrides?.monthly_outreach_emails != null ? overrides.monthly_outreach_emails : baseLimits.monthly_outreach_emails,
    max_social_accounts: overrides?.max_social_accounts != null ? overrides.max_social_accounts : baseLimits.max_social_accounts,
    max_email_accounts: overrides?.max_email_accounts != null ? overrides.max_email_accounts : baseLimits.max_email_accounts,
    max_campaigns: overrides?.max_campaigns != null ? overrides.max_campaigns : baseLimits.max_campaigns,
    planName: plan?.name || "Free Tier",
    planSlug,
    planDescription: plan?.description || null,
    priceMonthly: Number(plan?.price_monthly || 0),
    priceYearly: Number(plan?.price_yearly || 0),
    currency: plan?.currency || "USD",
    features: Array.isArray(plan?.features) ? plan.features : ["Leads", "Social Posts", "Outreach Emails"],
    rawOverrides: overrides
      ? {
          monthly_leads: overrides.monthly_leads,
          monthly_social_posts: overrides.monthly_social_posts,
          monthly_outreach_emails: overrides.monthly_outreach_emails,
          max_social_accounts: overrides.max_social_accounts,
          max_email_accounts: overrides.max_email_accounts,
          max_campaigns: overrides.max_campaigns,
        }
      : null,
  };
}

/**
 * Fetch current usage metrics and calculate quota utilization for all resources.
 */
export async function getUserUsageAndLimits(userId: string): Promise<UserUsageSummary> {
  const effective = await getEffectiveLimits(userId);

  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  // Query usage counts and usage_counters in parallel
  const [
    leadsCount,
    postsCount,
    outreachEmailsCount,
    socialAccountsCount,
    emailAccountsCount,
    socialCampaignsCount,
    outreachCampaignsCount,
    usageCounters,
  ] = await Promise.all([
    db.leads.count({
      where: { user_id: userId, collected_at: { gte: startOfMonth } },
    }).catch(() => 0),
    db.post_runs.count({
      where: {
        user_id: userId,
        created_at: { gte: startOfMonth },
        status: { in: ["published", "scheduled", "generating"] as any },
      },
    }).catch(() => 0),
    db.email_messages.count({
      where: {
        user_id: userId,
        sent_at: { gte: startOfMonth },
        direction: "out" as any,
      },
    }).catch(() => 0),
    db.social_accounts.count({
      where: { user_id: userId },
    }).catch(() => 0),
    db.email_accounts.count({
      where: { user_id: userId },
    }).catch(() => 0),
    db.social_campaigns.count({
      where: { user_id: userId, status: "active" as any },
    }).catch(() => 0),
    db.outreach_campaigns.count({
      where: { user_id: userId, status: { in: ["running", "scheduled"] } as any },
    }).catch(() => 0),
    db.usage_counters.findMany({
      where: { user_id: userId, period },
    }).catch(() => []),
  ]);

  const counterMap: Record<string, number> = {};
  for (const c of usageCounters) {
    counterMap[c.resource] = Number(c.quantity || 0);
  }

  const effectiveLeads = Math.max(counterMap["monthly_leads"] || 0, leadsCount);
  const effectivePosts = Math.max(counterMap["monthly_social_posts"] || 0, postsCount);
  const effectiveOutreach = Math.max(counterMap["monthly_outreach_emails"] || 0, outreachEmailsCount);
  const activeCampaignsCount = socialCampaignsCount + outreachCampaignsCount;

  function buildQuota(current: number, limit: number): ResourceUsage {
    const remaining = Math.max(0, limit - current);
    const percentage = limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0;
    return {
      current,
      limit,
      remaining,
      percentage,
      isExceeded: current >= limit,
    };
  }

  return {
    plan: {
      name: effective.planName,
      slug: effective.planSlug,
      description: effective.planDescription,
      price_monthly: effective.priceMonthly,
      price_yearly: effective.priceYearly,
      currency: effective.currency,
      features: effective.features,
    },
    limits: {
      monthly_leads: buildQuota(effectiveLeads, effective.monthly_leads),
      monthly_social_posts: buildQuota(effectivePosts, effective.monthly_social_posts),
      monthly_outreach_emails: buildQuota(effectiveOutreach, effective.monthly_outreach_emails),
      max_social_accounts: buildQuota(socialAccountsCount, effective.max_social_accounts),
      max_email_accounts: buildQuota(emailAccountsCount, effective.max_email_accounts),
      max_campaigns: buildQuota(activeCampaignsCount, effective.max_campaigns),
    },
    overrides: effective.rawOverrides,
  };
}

/**
 * Check whether a user is allowed to consume additional resource units.
 */
export async function checkLimit(
  userId: string,
  resource: PlanLimitResource,
  increment = 1
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number; message?: string }> {
  const usage = await getUserUsageAndLimits(userId);
  const item = usage.limits[resource];

  if (!item) {
    return { allowed: true, current: 0, limit: 999999, remaining: 999999 };
  }

  const requestedTotal = item.current + increment;
  if (requestedTotal > item.limit) {
    const resourceName = RESOURCE_LABELS[resource] || resource;
    const message = `Plan quota exceeded for ${resourceName}: current usage is ${item.current}/${item.limit} (attempted +${increment}). Please upgrade your plan or request a quota override from support.`;
    return {
      allowed: false,
      current: item.current,
      limit: item.limit,
      remaining: item.remaining,
      message,
    };
  }

  return {
    allowed: true,
    current: item.current,
    limit: item.limit,
    remaining: Math.max(0, item.limit - requestedTotal),
  };
}

/**
 * Assert that a user has sufficient quota. Throws an Error with a user-friendly message if exhausted.
 */
export async function assertLimit(
  userId: string,
  resource: PlanLimitResource,
  increment = 1
): Promise<void> {
  const result = await checkLimit(userId, resource, increment);
  if (!result.allowed) {
    throw new Error(result.message);
  }
}
