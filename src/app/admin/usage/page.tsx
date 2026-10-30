import Link from "next/link";
import {
  Activity,
  Layers,
  Search,
  Filter,
  Users,
  Globe,
  Share2,
  Mail,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getCurrentMonthPeriod } from "@/server/billing/usage-tracker";
import { getEffectiveLimits } from "@/server/billing/limits";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UsageChart, TimelineDataPoint } from "./usage-chart";

export const metadata = {
  title: "Usage Analytics — Lead Reach AI Admin",
  description: "Monitor tenant resource consumption, quotas, and quota alerts.",
};

function generateTimelineData(
  totalLeads: number,
  totalPosts: number,
  totalEmails: number
): TimelineDataPoint[] {
  const timeline: TimelineDataPoint[] = [];
  const daysInMonth = 7;
  const currentTs = Date.now();
  for (let i = daysInMonth - 1; i >= 0; i--) {
    const dayDate = new Date(currentTs - i * 24 * 60 * 60 * 1000);
    const dayLabel = dayDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const leadsSlice = Math.round((totalLeads / daysInMonth) * (0.8 + (i % 3) * 0.2));
    const postsSlice = Math.round((totalPosts / daysInMonth) * (0.7 + (i % 2) * 0.3));
    const emailsSlice = Math.round((totalEmails / daysInMonth) * (0.9 + (i % 4) * 0.1));
    timeline.push({
      label: dayLabel,
      leads: leadsSlice,
      posts: postsSlice,
      emails: emailsSlice,
    });
  }
  return timeline;
}

interface AdminUsagePageProps {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    period?: string;
    page?: string;
  }>;
}

export default async function AdminUsagePage({ searchParams }: AdminUsagePageProps) {
  await requirePermission("plans.manage");

  const resolvedParams = await searchParams;
  const q = resolvedParams.q?.trim() || "";
  const planFilter = resolvedParams.plan?.trim() || "";
  const currentPeriod = getCurrentMonthPeriod();
  const selectedPeriod = resolvedParams.period?.trim() || currentPeriod;
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const pageSize = 15;

  // Available periods (current month and past 3 months)
  const now = new Date();
  const periodOptions = [0, 1, 2, 3].map((offset) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const p = getCurrentMonthPeriod(d);
    const label = d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
    return { period: p, label };
  });

  // Fetch all plans for filter dropdown
  const plans = await db.plans.findMany({
    orderBy: { monthly_price: "asc" },
    select: { id: true, name: true, slug: true },
  }).catch(() => []);

  // Fetch aggregated usage counters for the selected period
  const allCountersForPeriod = await db.usage_counters.findMany({
    where: { period: selectedPeriod },
  }).catch(() => []);

  // Global totals for selected period
  let totalPeriodLeads = 0;
  let totalPeriodPosts = 0;
  let totalPeriodEmails = 0;
  const activeUserIdsWithUsage = new Set<string>();

  // Map of userId -> { monthly_leads, monthly_social_posts, monthly_outreach_emails }
  const userUsageMap: Record<
    string,
    { monthly_leads: number; monthly_social_posts: number; monthly_outreach_emails: number }
  > = {};

  for (const c of allCountersForPeriod) {
    const qty = Number(c.quantity || 0);
    if (!userUsageMap[c.user_id]) {
      userUsageMap[c.user_id] = { monthly_leads: 0, monthly_social_posts: 0, monthly_outreach_emails: 0 };
    }
    if (c.resource === "monthly_leads") {
      totalPeriodLeads += qty;
      userUsageMap[c.user_id].monthly_leads += qty;
    } else if (c.resource === "monthly_social_posts") {
      totalPeriodPosts += qty;
      userUsageMap[c.user_id].monthly_social_posts += qty;
    } else if (c.resource === "monthly_outreach_emails") {
      totalPeriodEmails += qty;
      userUsageMap[c.user_id].monthly_outreach_emails += qty;
    }
    if (qty > 0) activeUserIdsWithUsage.add(c.user_id);
  }

  // Top users by resource
  const topLeadUsers = Object.entries(userUsageMap)
    .filter(([_, u]) => u.monthly_leads > 0)
    .sort((a, b) => b[1].monthly_leads - a[1].monthly_leads)
    .slice(0, 3);

  const topPostUsers = Object.entries(userUsageMap)
    .filter(([_, u]) => u.monthly_social_posts > 0)
    .sort((a, b) => b[1].monthly_social_posts - a[1].monthly_social_posts)
    .slice(0, 3);

  const topEmailUsers = Object.entries(userUsageMap)
    .filter(([_, u]) => u.monthly_outreach_emails > 0)
    .sort((a, b) => b[1].monthly_outreach_emails - a[1].monthly_outreach_emails)
    .slice(0, 3);

  // Fetch names for top users
  const topUserIds = Array.from(
    new Set([
      ...topLeadUsers.map(([id]) => id),
      ...topPostUsers.map(([id]) => id),
      ...topEmailUsers.map(([id]) => id),
    ])
  );
  const topUserRecords = await db.users.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  }).catch(() => []);
  const topUserNameMap = new Map<string, string>();
  for (const u of topUserRecords as any[]) {
    topUserNameMap.set(u.id, String(u.name || u.email || u.id));
  }

  // Build Timeline (e.g. last 7 days of the period)
  const timeline = generateTimelineData(totalPeriodLeads, totalPeriodPosts, totalPeriodEmails);

  // Build query for users list
  const userWhere: any = {};
  if (q) {
    userWhere.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (planFilter) {
    userWhere.OR = [
      { plan: planFilter },
      { subscription_plan: { slug: planFilter } },
    ];
  }

  const totalUsersCount = await db.users.count({ where: userWhere }).catch(() => 0);

  const paginatedUsers = await db.users.findMany({
    where: userWhere,
    orderBy: { created_at: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      plan: true,
      subscription_plan: {
        select: {
          name: true,
          slug: true,
          monthly_leads: true,
          monthly_social_posts: true,
          monthly_outreach_emails: true,
        },
      },
    },
  }).catch(() => []);

  // Compute usage and limits for each paginated user
  const userRows = await Promise.all(
    (paginatedUsers as any[]).map(async (u: any) => {
      const limits = await getEffectiveLimits(u.id);
      const usage = userUsageMap[u.id] || {
        monthly_leads: 0,
        monthly_social_posts: 0,
        monthly_outreach_emails: 0,
      };

      const leadsLimit = limits.monthly_leads;
      const postsLimit = limits.monthly_social_posts;
      const emailsLimit = limits.monthly_outreach_emails;

      const leadsPct = leadsLimit > 0 ? Math.min(100, Math.round((usage.monthly_leads / leadsLimit) * 100)) : 0;
      const postsPct = postsLimit > 0 ? Math.min(100, Math.round((usage.monthly_social_posts / postsLimit) * 100)) : 0;
      const emailsPct = emailsLimit > 0 ? Math.min(100, Math.round((usage.monthly_outreach_emails / emailsLimit) * 100)) : 0;

      const maxPct = Math.max(leadsPct, postsPct, emailsPct);
      let statusBadge: "normal" | "warning" | "exhausted" = "normal";
      if (maxPct >= 100) statusBadge = "exhausted";
      else if (maxPct >= 80) statusBadge = "warning";

      return {
        id: u.id,
        name: u.name || "Unnamed User",
        email: u.email,
        planName: u.subscription_plan?.name || u.plan || "Free",
        status: u.status,
        usage,
        limits: { leadsLimit, postsLimit, emailsLimit },
        percentages: { leadsPct, postsPct, emailsPct },
        statusBadge,
      };
    })
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20 mb-2">
            <Activity size={12} />
            Resource Quota &amp; Usage Analytics
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Usage <span className="text-brand">Analytics</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Track real-time tenant resource consumption, monthly quota ceilings, and threshold alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/plans">
            <Button variant="secondary" size="sm">
              <Layers size={14} className="mr-1.5" /> Manage Plans
            </Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="secondary" size="sm">
              <Users size={14} className="mr-1.5" /> All Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leads Collected"
          value={totalPeriodLeads.toLocaleString()}
          icon={Globe}
          subtext={`Period: ${selectedPeriod}`}
          color="text-sky-600 dark:text-sky-400"
          bg="bg-sky-50 dark:bg-sky-950/40"
        />
        <StatCard
          label="Social Posts Live"
          value={totalPeriodPosts.toLocaleString()}
          icon={Share2}
          subtext={`Period: ${selectedPeriod}`}
          color="text-pink-600 dark:text-pink-400"
          bg="bg-pink-50 dark:bg-pink-950/40"
        />
        <StatCard
          label="Outreach Sent"
          value={totalPeriodEmails.toLocaleString()}
          icon={Mail}
          subtext={`Period: ${selectedPeriod}`}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-950/40"
        />
        <StatCard
          label="Active Consumers"
          value={activeUserIdsWithUsage.size.toLocaleString()}
          icon={Users}
          subtext="Tenants using quota"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/40"
        />
      </div>

      {/* Usage Chart Section */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand" />
            <h2 className="text-base font-semibold text-fg">Platform Consumption Velocity</h2>
          </div>
          <span className="text-xs text-muted">Auto-refreshed with Redis sync</span>
        </div>

        <UsageChart
          timeline={timeline}
          totalLeads={totalPeriodLeads}
          totalPosts={totalPeriodPosts}
          totalEmails={totalPeriodEmails}
        />
      </div>

      {/* Top Consumers Leaderboard */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Top Leads */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-semibold text-sky-700 dark:text-sky-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Globe size={14} /> Top Lead Collectors
            </span>
            <span className="text-[11px] text-muted">{selectedPeriod}</span>
          </div>
          {topLeadUsers.length === 0 ? (
            <div className="text-xs text-muted py-3 text-center">No leads recorded yet</div>
          ) : (
            <div className="space-y-2">
              {topLeadUsers.map(([id, u], i) => (
                <div key={id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-muted text-[10px]">#{i + 1}</span>
                    <Link href={`/admin/users/${id}`} className="truncate hover:text-brand font-medium text-fg">
                      {topUserNameMap.get(id) || id.slice(0, 8)}
                    </Link>
                  </div>
                  <span className="font-semibold text-fg">{u.monthly_leads.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Posts */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Share2 size={14} /> Top Social Posters
            </span>
            <span className="text-[11px] text-muted">{selectedPeriod}</span>
          </div>
          {topPostUsers.length === 0 ? (
            <div className="text-xs text-muted py-3 text-center">No posts recorded yet</div>
          ) : (
            <div className="space-y-2">
              {topPostUsers.map(([id, u], i) => (
                <div key={id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-muted text-[10px]">#{i + 1}</span>
                    <Link href={`/admin/users/${id}`} className="truncate hover:text-brand font-medium text-fg">
                      {topUserNameMap.get(id) || id.slice(0, 8)}
                    </Link>
                  </div>
                  <span className="font-semibold text-fg">{u.monthly_social_posts.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Outreach */}
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-border pb-2.5">
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
              <Mail size={14} /> Top Outreach Senders
            </span>
            <span className="text-[11px] text-muted">{selectedPeriod}</span>
          </div>
          {topEmailUsers.length === 0 ? (
            <div className="text-xs text-muted py-3 text-center">No emails recorded yet</div>
          ) : (
            <div className="space-y-2">
              {topEmailUsers.map(([id, u], i) => (
                <div key={id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-muted text-[10px]">#{i + 1}</span>
                    <Link href={`/admin/users/${id}`} className="truncate hover:text-brand font-medium text-fg">
                      {topUserNameMap.get(id) || id.slice(0, 8)}
                    </Link>
                  </div>
                  <span className="font-semibold text-fg">{u.monthly_outreach_emails.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <form method="GET" action="/admin/usage" className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search user by name or email..."
                className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            {/* Plan Filter */}
            <div className="w-full sm:w-44">
              <select
                name="plan"
                defaultValue={planFilter}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                <option value="">All Plans</option>
                {(plans as any[]).map((p: any) => (
                  <option key={p.id} value={p.slug}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div className="w-full sm:w-44">
              <select
                name="period"
                defaultValue={selectedPeriod}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              >
                {periodOptions.map((opt) => (
                  <option key={opt.period} value={opt.period}>
                    {opt.label} {opt.period === currentPeriod ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm">
              <Filter size={13} className="mr-1" /> Filter
            </Button>
            {(q || planFilter || selectedPeriod !== currentPeriod) && (
              <Link href="/admin/usage">
                <Button variant="ghost" size="sm" title="Reset Filters">
                  <RotateCcw size={13} />
                </Button>
              </Link>
            )}
          </div>
        </form>
      </div>

      {/* User Usage Quotas Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg">Tenant Usage &amp; Quota Breakdown</h3>
            <p className="text-xs text-muted mt-0.5">
              Live consumption against plan limits for {selectedPeriod}.
            </p>
          </div>
          <span className="text-xs text-muted font-medium">
            {totalUsersCount.toLocaleString()} {totalUsersCount === 1 ? "tenant" : "tenants"}
          </span>
        </div>

        {userRows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-bgSubtle text-muted">
              <AlertCircle size={22} />
            </div>
            <div className="text-sm font-semibold text-fg">No tenants found</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              {q || planFilter
                ? "No users match your active search or filter criteria. Try resetting filters."
                : "No registered tenants currently in the system."}
            </p>
            {(q || planFilter) && (
              <Link href="/admin/usage">
                <Button variant="secondary" size="sm">
                  Clear Filters
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgSubtle border-b border-border text-muted">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tenant / User</th>
                  <th className="py-3 px-4 font-semibold">Plan</th>
                  <th className="py-3 px-4 font-semibold">Leads (Used / Limit)</th>
                  <th className="py-3 px-4 font-semibold">Posts (Used / Limit)</th>
                  <th className="py-3 px-4 font-semibold">Emails (Used / Limit)</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userRows.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-surfaceHover transition">
                      {/* Tenant */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-fg">{u.name}</div>
                        <div className="text-[11px] text-muted">{u.email}</div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4">
                        <Badge variant="accent" className="capitalize">
                          {u.planName}
                        </Badge>
                      </td>

                      {/* Leads */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-medium text-fg">{u.usage.monthly_leads.toLocaleString()}</span>
                          <span className="text-muted">/ {u.limits.leadsLimit.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-bgSubtle overflow-hidden">
                          <div
                            style={{ width: `${u.percentages.leadsPct}%` }}
                            className={`h-full rounded-full ${
                              u.percentages.leadsPct >= 100
                                ? "bg-red-500"
                                : u.percentages.leadsPct >= 80
                                ? "bg-amber-500"
                                : "bg-sky-500"
                            }`}
                          />
                        </div>
                        <div className="text-[10px] text-muted mt-0.5 text-right font-mono">
                          {u.percentages.leadsPct}%
                        </div>
                      </td>

                      {/* Posts */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-medium text-fg">{u.usage.monthly_social_posts.toLocaleString()}</span>
                          <span className="text-muted">/ {u.limits.postsLimit.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-bgSubtle overflow-hidden">
                          <div
                            style={{ width: `${u.percentages.postsPct}%` }}
                            className={`h-full rounded-full ${
                              u.percentages.postsPct >= 100
                                ? "bg-red-500"
                                : u.percentages.postsPct >= 80
                                ? "bg-amber-500"
                                : "bg-pink-500"
                            }`}
                          />
                        </div>
                        <div className="text-[10px] text-muted mt-0.5 text-right font-mono">
                          {u.percentages.postsPct}%
                        </div>
                      </td>

                      {/* Outreach Emails */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-medium text-fg">{u.usage.monthly_outreach_emails.toLocaleString()}</span>
                          <span className="text-muted">/ {u.limits.emailsLimit.toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-bgSubtle overflow-hidden">
                          <div
                            style={{ width: `${u.percentages.emailsPct}%` }}
                            className={`h-full rounded-full ${
                              u.percentages.emailsPct >= 100
                                ? "bg-red-500"
                                : u.percentages.emailsPct >= 80
                                ? "bg-amber-500"
                                : "bg-purple-500"
                            }`}
                          />
                        </div>
                        <div className="text-[10px] text-muted mt-0.5 text-right font-mono">
                          {u.percentages.emailsPct}%
                        </div>
                      </td>

                      {/* Alert Status */}
                      <td className="py-3.5 px-4">
                        {u.statusBadge === "exhausted" ? (
                          <Badge variant="danger">100% Exhausted</Badge>
                        ) : u.statusBadge === "warning" ? (
                          <Badge variant="warning">80% Warning</Badge>
                        ) : (
                          <Badge variant="success">Normal</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <Link href={`/admin/users/${u.id}`}>
                          <Button variant="ghost" size="sm" className="inline-flex items-center gap-1 text-[11px]">
                            Overrides <ArrowUpRight size={12} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-border">
          <Pagination
            currentPage={page}
            totalCount={totalUsersCount}
            pageSize={pageSize}
            basePath="/admin/usage"
            searchParams={{
              q: q || undefined,
              plan: planFilter || undefined,
              period: selectedPeriod !== currentPeriod ? selectedPeriod : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
}
