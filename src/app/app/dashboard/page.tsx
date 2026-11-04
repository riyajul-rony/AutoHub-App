import React from "react";
import Link from "next/link";
import {
  Users,
  Share2,
  Mail,
  Repeat2,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Globe,
  SlidersHorizontal,
} from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { getUserUsageAndLimits } from "@/server/billing/limits";
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
  EmptyState,
} from "@/components/ui";

export const metadata = {
  title: "Dashboard — Lead Reach AI",
  description: "Monitor your automations, leads, and outreach campaigns in real time.",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const userId = user.id;

  const [
    totalLeads,
    publishedPosts,
    sentEmails,
    repliesReceived,
    pendingApprovals,
    runningOutreachCount,
    recentSearches,
    limitsAndUsage,
  ] = await Promise.all([
    db.leads.count({ where: { user_id: userId } }),
    db.post_runs.count({ where: { user_id: userId, status: "published" } }),
    db.email_messages.count({ where: { user_id: userId, direction: "out", status: "sent" } }),
    db.email_messages.count({ where: { user_id: userId, direction: "in" } }),
    db.post_runs.count({ where: { user_id: userId, status: "pending_approval" } }),
    db.outreach_campaigns.count({ where: { user_id: userId, status: "running" } }),
    db.lead_searches.findMany({ where: { user_id: userId }, take: 1, orderBy: { created_at: "desc" } }),
    getUserUsageAndLimits(userId),
  ]);

  const replyRate = sentEmails > 0 ? ((repliesReceived / sentEmails) * 100).toFixed(1) + "%" : "0.0%";

  const stats = [
    {
      label: "Total Leads Gathered",
      val: totalLeads.toLocaleString(),
      status: totalLeads > 0 ? "Active" : "Ready",
      variant: totalLeads > 0 ? ("success" as const) : ("neutral" as const),
      icon: <Users className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />,
    },
    {
      label: "Social Posts Published",
      val: publishedPosts.toLocaleString(),
      status: publishedPosts > 0 ? "Live" : "Scheduled",
      variant: publishedPosts > 0 ? ("success" as const) : ("neutral" as const),
      icon: <Share2 className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />,
    },
    {
      label: "Emails Dispatched",
      val: sentEmails.toLocaleString(),
      status: runningOutreachCount > 0 ? "Sending" : "Standby",
      variant: runningOutreachCount > 0 ? ("accent" as const) : ("neutral" as const),
      icon: <Mail className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />,
    },
    {
      label: "Response Rate",
      val: replyRate,
      status: `${repliesReceived} replies`,
      variant: repliesReceived > 0 ? ("success" as const) : ("neutral" as const),
      icon: <Repeat2 className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />,
    },
  ];

  const hasActivity = totalLeads > 0 || publishedPosts > 0 || sentEmails > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance Dashboard"
        description="Real-time metrics, quotas, and active pipelines across your connected accounts."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/leads">
              <Button variant="secondary" size="sm" icon={<Plus className="w-3.5 h-3.5" strokeWidth={1.5} />}>
                Find Leads
              </Button>
            </Link>
            <Link href="/app/outreach/new">
              <Button variant="primary" size="sm" icon={<Mail className="w-3.5 h-3.5" strokeWidth={1.5} />}>
                New Campaign
              </Button>
            </Link>
          </div>
        }
      />

      {/* Real KPI Cards */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 space-y-3 transition-colors duration-150 hover:border-borderStrong">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-muted">{s.label}</span>
              {s.icon}
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tracking-tight text-text">{s.val}</span>
              <Badge variant={s.variant} size="sm" dot>
                {s.status}
              </Badge>
            </div>
          </Card>
        ))}
      </section>

      {/* Plan Quotas & Resource Utilization */}
      <Card className="transition-colors duration-150 hover:border-borderStrong">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle>Plan Quotas &amp; Monthly Usage</CardTitle>
              <Badge variant="accent" size="sm">
                {limitsAndUsage.plan.name} Tier
              </Badge>
            </div>
            <CardDescription>Current billing period usage towards your resource caps.</CardDescription>
          </div>

          <Link href="/app/settings/billing">
            <Button variant="secondary" size="sm" icon={<ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />}>
              Manage Billing
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Monthly Leads */}
            <div className="rounded-[8px] border border-border bg-bg-subtle p-3.5 space-y-2 transition-colors duration-150 hover:border-borderStrong">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.5} /> Leads Found
                </span>
                <span className="text-text-muted font-mono">
                  {limitsAndUsage.limits.monthly_leads.current} /{" "}
                  {limitsAndUsage.limits.monthly_leads.limit >= 999999
                    ? "∞"
                    : limitsAndUsage.limits.monthly_leads.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border/50">
                <div
                  className="bg-[var(--brand-emerald)] h-full rounded-full transition-all duration-300"
                  style={{ width: `${limitsAndUsage.limits.monthly_leads.percentage}%` }}
                />
              </div>
              <div className="text-[11px] text-text-subtle flex justify-between">
                <span>{limitsAndUsage.limits.monthly_leads.remaining} remaining</span>
                <span>
                  {limitsAndUsage.limits.monthly_leads.limit >= 999999
                    ? "Unlimited"
                    : `${limitsAndUsage.limits.monthly_leads.percentage}%`}
                </span>
              </div>
            </div>

            {/* Social Posts */}
            <div className="rounded-[8px] border border-border bg-bg-subtle p-3.5 space-y-2 transition-colors duration-150 hover:border-borderStrong">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.5} /> Social Posts
                </span>
                <span className="text-text-muted font-mono">
                  {limitsAndUsage.limits.monthly_social_posts.current} /{" "}
                  {limitsAndUsage.limits.monthly_social_posts.limit >= 999999
                    ? "∞"
                    : limitsAndUsage.limits.monthly_social_posts.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border/50">
                <div
                  className="bg-[var(--brand-emerald)] h-full rounded-full transition-all duration-300"
                  style={{ width: `${limitsAndUsage.limits.monthly_social_posts.percentage}%` }}
                />
              </div>
              <div className="text-[11px] text-text-subtle flex justify-between">
                <span>{limitsAndUsage.limits.monthly_social_posts.remaining} remaining</span>
                <span>
                  {limitsAndUsage.limits.monthly_social_posts.limit >= 999999
                    ? "Unlimited"
                    : `${limitsAndUsage.limits.monthly_social_posts.percentage}%`}
                </span>
              </div>
            </div>

            {/* Outreach Emails */}
            <div className="rounded-[8px] border border-border bg-bg-subtle p-3.5 space-y-2 transition-colors duration-150 hover:border-borderStrong">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.5} /> Outreach Emails
                </span>
                <span className="text-text-muted font-mono">
                  {limitsAndUsage.limits.monthly_outreach_emails.current} /{" "}
                  {limitsAndUsage.limits.monthly_outreach_emails.limit >= 999999
                    ? "∞"
                    : limitsAndUsage.limits.monthly_outreach_emails.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden border border-border/50">
                <div
                  className="bg-[var(--brand-emerald)] h-full rounded-full transition-all duration-300"
                  style={{ width: `${limitsAndUsage.limits.monthly_outreach_emails.percentage}%` }}
                />
              </div>
              <div className="text-[11px] text-text-subtle flex justify-between">
                <span>{limitsAndUsage.limits.monthly_outreach_emails.remaining} remaining</span>
                <span>
                  {limitsAndUsage.limits.monthly_outreach_emails.limit >= 999999
                    ? "Unlimited"
                    : `${limitsAndUsage.limits.monthly_outreach_emails.percentage}%`}
                </span>
              </div>
            </div>
          </div>

          {/* Connected channel counts */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted pt-3 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--badge-success-dot)]" />
              <span>
                Social Accounts: <strong className="text-text">{limitsAndUsage.limits.max_social_accounts.current}</strong> /{" "}
                {limitsAndUsage.limits.max_social_accounts.limit}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--badge-success-dot)]" />
              <span>
                Connected Inboxes: <strong className="text-text">{limitsAndUsage.limits.max_email_accounts.current}</strong> /{" "}
                {limitsAndUsage.limits.max_email_accounts.limit}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--badge-warning-dot)]" />
              <span>
                Active Campaigns: <strong className="text-text">{limitsAndUsage.limits.max_campaigns.current}</strong> /{" "}
                {limitsAndUsage.limits.max_campaigns.limit}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity or Empty State */}
      {!hasActivity ? (
        <EmptyState
          icon={<Inbox className="w-5 h-5" strokeWidth={1.5} />}
          title="No automation activity recorded yet"
          description="Start by connecting an email inbox, scraping leads from Google Maps, or scheduling a social campaign."
          actionLabel="Go to Automation Hub"
          actionHref="/app"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Attention Panel */}
          <Card className="transition-colors duration-150 hover:border-borderStrong">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Approvals &amp; Alerts</CardTitle>
              <Badge variant={pendingApprovals > 0 ? "warning" : "success"} size="sm" dot>
                {pendingApprovals > 0 ? `${pendingApprovals} Pending` : "All Clear"}
              </Badge>
            </CardHeader>
            <CardContent>
              {pendingApprovals > 0 ? (
                <div className="flex items-center justify-between p-3 rounded-[6px] border border-border bg-bg-subtle text-xs">
                  <div>
                    <p className="font-semibold text-text">Social Posts Awaiting Review</p>
                    <p className="text-text-muted mt-0.5">{pendingApprovals} posts generated by AI require approval.</p>
                  </div>
                  <Link href="/app/social/history">
                    <Button variant="primary" size="sm">
                      Review
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-xs text-text-muted p-2">
                  <div className="w-6 h-6 rounded-full bg-[var(--brand-emerald-subtle)] border border-[var(--brand-emerald-border)] flex items-center justify-center text-[var(--badge-success-text)] shrink-0">
                    <CheckCircle2 size={13} strokeWidth={2} />
                  </div>
                  <span>All queues and scheduled campaigns are operating within normal parameters.</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Operations */}
          <Card className="transition-colors duration-150 hover:border-borderStrong">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Recent Operations</CardTitle>
              <Link href="/app/leads">
                <span className="text-xs text-text-muted hover:text-text transition-colors">View all →</span>
              </Link>
            </CardHeader>
            <CardContent>
              {recentSearches.length > 0 ? (
                <div className="space-y-2 text-xs">
                  {recentSearches.map((s: { id: string; query?: string | null; location?: string | null; results_count?: number | null }) => (
                    <div key={s.id} className="flex items-center justify-between p-2.5 rounded-[6px] border border-border bg-bg-subtle transition-colors hover:border-borderStrong">
                      <div>
                        <p className="font-semibold text-text">{s.query || "Lead Search"}</p>
                        <p className="text-text-muted mt-0.5">{s.location || "Worldwide"} • {s.results_count || 0} leads</p>
                      </div>
                      <Link href={`/app/leads/searches/${s.id}`}>
                        <Button variant="secondary" size="sm">
                          Results
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted p-2">No recent searches performed.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
