import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Building,
  Globe,
  CheckCircle2,
  AlertCircle,
  Share2,
  FileSpreadsheet,
  Key,
  Database,
  Activity,
  Laptop,
  Layers,
  Sliders,
  Mail,
} from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getUserUsageAndLimits } from "@/server/billing/limits";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { UserDetailActions } from "./user-detail-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "User Profile & Tenant Inspection — Lead Reach AI Admin",
  description: "Comprehensive user account inspection, usage metrics, and security controls.",
};

interface UserDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const currentAdmin = await requirePermission("users.read");
  const { id: userId } = await params;

  // 1. Fetch user core record
  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      plan: true,
      business_name: true,
      business_category: true,
      country: true,
      timezone: true,
      goals: true,
      email_verified_at: true,
      onboarded_at: true,
      created_at: true,
      last_login_at: true,
      deletion_requested_at: true,
    },
  });

  if (!user) {
    notFound();
  }

  // 2. Fetch account integrations & usage metrics in parallel
  const [
    socialAccountsCount,
    googleConnectionsCount,
    emailAccountsCount,
    apiKeysCount,
    leadsCount,
    postsPublishedCount,
    outreachCampaignsCount,
    emailsSentCount,
    recentActivity,
    activeSessions,
    availablePlans,
    userOverrides,
    limitsAndUsage,
  ] = await Promise.all([
    db.social_accounts.count({ where: { user_id: userId } }).catch(() => 0),
    db.google_connections.count({ where: { user_id: userId } }).catch(() => 0),
    db.email_accounts.count({ where: { user_id: userId } }).catch(() => 0),
    db.api_keys.count({ where: { user_id: userId } }).catch(() => 0),
    db.leads.count({ where: { user_id: userId } }).catch(() => 0),
    db.post_runs.count({ where: { user_id: userId, status: "published" } }).catch(() => 0),
    db.outreach_campaigns.count({ where: { user_id: userId } }).catch(() => 0),
    db.email_messages.count({ where: { user_id: userId, status: "sent" } }).catch(() => 0),
    db.activity_logs.findMany({
      where: { user_id: userId },
      take: 15,
      orderBy: { created_at: "desc" },
    }).catch(() => []),
    db.sessions.findMany({
      where: { user_id: userId, expires_at: { gt: new Date() } },
      orderBy: { created_at: "desc" },
    }).catch(() => []),
    db.plans.findMany({ where: { is_active: true }, orderBy: { monthly_price: "asc" } }).catch(() => []),
    db.user_limit_overrides.findUnique({ where: { user_id: userId } }).catch(() => null),
    getUserUsageAndLimits(userId),
  ]);

  const isCurrentAdmin = currentAdmin.id === user.id;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Back to Users Directory
          </Button>
        </Link>
        <Badge variant="neutral" size="sm" className="font-mono">
          User ID: {user.id.slice(0, 8)}...
        </Badge>
      </div>

      {/* Profile Overview Header */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-brand font-bold text-xl uppercase shrink-0 border border-border">
              {user.name ? user.name.charAt(0) : user.email.charAt(0)}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-fg flex items-center gap-2">
                <span>{user.name || "Unnamed User"}</span>
                {isCurrentAdmin && (
                  <Badge variant="accent" size="sm">
                    You (Active Session)
                  </Badge>
                )}
              </h1>
              <div className="text-xs text-muted font-mono mt-0.5">{user.email}</div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge role={user.role} />
                <StatusBadge status={user.status} />
                <Badge variant="neutral" size="sm" className="capitalize">
                  Plan: {user.plan || "free"}
                </Badge>
                {user.email_verified_at ? (
                  <span className="inline-flex items-center gap-1 text-xs text-accent-green font-medium">
                    <CheckCircle2 size={13} /> Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-500 font-medium">
                    <AlertCircle size={13} /> Email Unverified
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Action Toolbar */}
      <UserDetailActions
        userId={user.id}
        userEmail={user.email}
        currentRole={user.role}
        currentStatus={user.status}
        currentPlan={user.plan || "free"}
        isEmailVerified={Boolean(user.email_verified_at)}
        isCurrentAdmin={isCurrentAdmin}
        isSuperAdmin={currentAdmin.role === "super_admin"}
        availablePlans={availablePlans.map((p: any) => ({ id: p.id, slug: p.slug, name: p.name }))}
        initialOverrides={userOverrides}
      />

      {/* Plan Quotas & Limit Overrides Card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
                <Layers size={16} />
              </span>
              <div>
                <h2 className="text-base font-semibold text-fg flex items-center gap-2">
                  Plan Quotas &amp; Active Limits
                  <Badge variant="accent" size="sm" className="uppercase font-mono">
                    {limitsAndUsage.plan.name} Tier
                  </Badge>
                </h2>
                <p className="text-xs text-muted">
                  Effective resource quotas calculated from base plan and custom user overrides.
                </p>
              </div>
            </div>
            {userOverrides && (
              <Badge variant="neutral" size="sm">
                <Sliders size={12} className="mr-1" /> Custom Overrides Active
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Leads */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg flex items-center gap-1.5">
                  <Globe size={13} className="text-brand" /> Monthly Leads
                </span>
                {limitsAndUsage.overrides?.monthly_leads != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Usage:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.monthly_leads.current} / {limitsAndUsage.limits.monthly_leads.limit >= 999999 ? "∞" : limitsAndUsage.limits.monthly_leads.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-brand h-full rounded-full transition-all"
                  style={{
                    width: `${limitsAndUsage.limits.monthly_leads.percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Social Posts */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg flex items-center gap-1.5">
                  <Share2 size={13} className="text-blue-500" /> Monthly Social Posts
                </span>
                {limitsAndUsage.overrides?.monthly_social_posts != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Usage:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.monthly_social_posts.current} / {limitsAndUsage.limits.monthly_social_posts.limit >= 999999 ? "∞" : limitsAndUsage.limits.monthly_social_posts.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{
                    width: `${limitsAndUsage.limits.monthly_social_posts.percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Outreach Emails */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg flex items-center gap-1.5">
                  <Mail size={13} className="text-amber-500" /> Monthly Outreach Emails
                </span>
                {limitsAndUsage.overrides?.monthly_outreach_emails != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Usage:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.monthly_outreach_emails.current} / {limitsAndUsage.limits.monthly_outreach_emails.limit >= 999999 ? "∞" : limitsAndUsage.limits.monthly_outreach_emails.limit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{
                    width: `${limitsAndUsage.limits.monthly_outreach_emails.percentage}%`,
                  }}
                />
              </div>
            </div>

            {/* Connected Social Accounts */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">Connected Social Accounts</span>
                {limitsAndUsage.overrides?.max_social_accounts != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Connected:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.max_social_accounts.current} / {limitsAndUsage.limits.max_social_accounts.limit}
                </span>
              </div>
            </div>

            {/* Email Senders */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">Email Sender Accounts</span>
                {limitsAndUsage.overrides?.max_email_accounts != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Configured:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.max_email_accounts.current} / {limitsAndUsage.limits.max_email_accounts.limit}
                </span>
              </div>
            </div>

            {/* Campaigns */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-fg">Active Campaigns Cap</span>
                {limitsAndUsage.overrides?.max_campaigns != null && (
                  <Badge variant="neutral" size="sm">Override</Badge>
                )}
              </div>
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-muted">Total Campaigns:</span>
                <span className="font-mono font-semibold text-fg">
                  {limitsAndUsage.limits.max_campaigns.current} / {limitsAndUsage.limits.max_campaigns.limit}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Summary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Leads Collected"
          value={leadsCount.toLocaleString()}
          icon={Globe}
          color="text-brand"
          bg="bg-brand/10"
          subtext="Google Maps & Web scraping"
        />
        <StatCard
          label="Social Posts Published"
          value={postsPublishedCount.toLocaleString()}
          icon={Share2}
          color="text-blue-600 dark:text-blue-400"
          bg="bg-blue-500/10"
          subtext="FB, IG & LinkedIn automations"
        />
        <StatCard
          label="Outreach Campaigns"
          value={outreachCampaignsCount.toLocaleString()}
          icon={Mail}
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-500/10"
          subtext="Cold outreach sequences"
        />
        <StatCard
          label="Emails Dispatched"
          value={emailsSentCount.toLocaleString()}
          icon={Database}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
          subtext="Direct delivery records"
        />
      </div>

      {/* Account Details & Integrations Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile & Business Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building size={16} className="text-brand" /> Tenant &amp; Workspace Profile
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0 space-y-3">
            <div className="divide-y divide-border text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Business Name</span>
                <span className="font-semibold text-fg">{user.business_name || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Industry Category</span>
                <span className="font-semibold text-fg">{user.business_category || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Country</span>
                <span className="font-semibold text-fg">{user.country || "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Timezone</span>
                <span className="font-mono text-fg">{user.timezone || "UTC"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Registered Date</span>
                <span className="font-mono text-fg">{user.created_at ? new Date(user.created_at).toLocaleString() : "—"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Last Active Session</span>
                <span className="font-mono text-fg">{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : "Never"}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-muted">Onboarding Completed</span>
                <span className="font-semibold text-fg">{user.onboarded_at ? "Yes" : "Pending"}</span>
              </div>
            </div>

            {user.goals && user.goals.length > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="text-xs text-muted mb-1.5 font-medium">Selected Goals:</div>
                <div className="flex flex-wrap gap-1.5">
                  {user.goals.map((g: string, i: number) => (
                    <Badge key={i} variant="neutral" size="sm">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts & Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Key size={16} className="text-brand" /> Connected Services &amp; Integrations
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-bgSubtle p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Social Accounts</span>
                  <Share2 size={15} className="text-blue-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-fg">{socialAccountsCount}</div>
                <div className="text-xs text-muted">FB, IG &amp; LinkedIn profiles</div>
              </div>

              <div className="rounded-lg border border-border bg-bgSubtle p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Google Sheets</span>
                  <FileSpreadsheet size={15} className="text-emerald-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-fg">{googleConnectionsCount}</div>
                <div className="text-xs text-muted">Connected Sheets integrations</div>
              </div>

              <div className="rounded-lg border border-border bg-bgSubtle p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">Email Inboxes</span>
                  <Mail size={15} className="text-purple-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-fg">{emailAccountsCount}</div>
                <div className="text-xs text-muted">Active SMTP / Gmail accounts</div>
              </div>

              <div className="rounded-lg border border-border bg-bgSubtle p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted">API Keys</span>
                  <Key size={15} className="text-amber-500" />
                </div>
                <div className="mt-2 text-xl font-bold text-fg">{apiKeysCount}</div>
                <div className="text-xs text-muted">AES-256 encrypted provider keys</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Sessions & Recent Activity Logs Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Laptop size={16} className="text-brand" /> Active Logged-in Sessions
              </CardTitle>
              <Badge variant="neutral" size="sm" className="font-mono">
                {activeSessions.length} active
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {activeSessions.length === 0 ? (
              <p className="text-xs text-muted italic py-4">No active web sessions recorded for this user.</p>
            ) : (
              <div className="space-y-2">
                {activeSessions.map((s: any) => (
                  <div key={s.id} className="rounded-lg border border-border bg-bgSubtle p-3 text-xs flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-fg flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                        <span className="truncate max-w-[260px] font-mono text-xs">{s.user_agent || "Web Browser"}</span>
                      </div>
                      <div className="text-xs text-muted font-mono mt-0.5">
                        IP: {s.ip || "127.0.0.1"} • Expires: {new Date(s.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <span className="text-xs text-muted font-mono whitespace-nowrap">
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity size={16} className="text-brand" /> Recent Activity Logs
              </CardTitle>
              <Badge variant="neutral" size="sm">
                Latest {recentActivity.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted italic py-4">No recent activity recorded for this user.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentActivity.map((log: any) => (
                  <div key={log.id} className="rounded-lg border border-border bg-bgSubtle p-2.5 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-fg truncate">{log.type || "Event"}</div>
                      {log.message && <div className="text-xs text-muted truncate">{log.message}</div>}
                    </div>
                    <span className="text-xs text-muted font-mono whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
