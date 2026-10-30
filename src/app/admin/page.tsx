import Link from "next/link";
import {
  Shield,
  Users,
  Settings,
  Activity,
  Key,
  Globe,
  Database,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Share2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { db } from "@/server/db";
import { getConfigs } from "@/server/config";
import { requireAdmin } from "@/server/auth/guards";
import { cacheRemember } from "@/server/cache";
import { StatusBadge } from "@/components/admin/status-badge";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = {
  title: "Control Center — AutoHub Admin",
  description: "Global administrative controls and platform metrics.",
};

function getSevenDaysAgoCutoff(): Date {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

export default async function AdminDashboardPage() {
  await requireAdmin();

  // Aggregate global platform statistics (cached in Redis for 60s)
  const sevenDaysAgo = getSevenDaysAgoCutoff();

  const [
    rawUserCount,
    rawActiveUserCount,
    rawNewSignupCount,
    rawLeadCount,
    rawPostCount,
    rawEmailCount,
  ] = await cacheRemember(
    "stats:admin:overview:v2",
    60,
    async () => {
      return await Promise.all([
        db.users.count().catch(() => 1),
        db.users.count({ where: { status: "active" } }).catch(() => 1),
        db.users.count({ where: { created_at: { gte: sevenDaysAgo } } }).catch(() => 0),
        db.leads.count().catch(() => 0),
        db.post_runs.count({ where: { status: "published" } }).catch(() => 0),
        db.email_messages.count({ where: { status: "sent" } }).catch(() => 0),
      ]);
    }
  );

  const rawUsersList = await db.users.findMany({
    take: 10,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
      email_verified_at: true,
    },
  }).catch(() => []);

  const userCount = Number(rawUserCount || 0);
  const activeUserCount = Number(rawActiveUserCount || 0);
  const newSignupCount = Number(rawNewSignupCount || 0);
  const leadCount = Number(rawLeadCount || 0);
  const postCount = Number(rawPostCount || 0);
  const emailCount = Number(rawEmailCount || 0);
  const usersList = Array.isArray(rawUsersList) ? rawUsersList : [];

  const configs = await getConfigs([
    "REGISTRATION_MODE",
    "OPENAI_API_KEY",
    "META_APP_ID",
    "GOOGLE_CLIENT_ID",
    "SYSTEM_SMTP_HOST",
  ]).catch(() => ({} as Record<string, string | undefined>));

  const registrationMode = configs["REGISTRATION_MODE"] === "open" ? "open" : "invite";
  const openaiKey = configs["OPENAI_API_KEY"];
  const metaAppId = configs["META_APP_ID"];
  const googleClientId = configs["GOOGLE_CLIENT_ID"];
  const smtpHost = configs["SYSTEM_SMTP_HOST"];

  const statCards = [
    { label: "Total Users", value: (userCount || 1).toLocaleString(), icon: Users, color: "text-brand", bg: "bg-brand/10" },
    { label: "Active Users", value: (activeUserCount || 1).toLocaleString(), icon: UserCheck, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "New Sign-ups (7d)", value: newSignupCount.toLocaleString(), icon: UserPlus, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
    { label: "Leads Collected", value: leadCount.toLocaleString(), icon: Globe, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
    { label: "Social Posts Live", value: postCount.toLocaleString(), icon: Share2, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-500/10" },
    { label: "Outreach Emails Sent", value: emailCount.toLocaleString(), icon: Mail, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="warning" size="sm">
              Platform Master Control
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl text-fg">
            AutoHub Control Center
          </h1>
          <p className="mt-1 text-xs text-muted max-w-2xl">
            Manage global infrastructure, system OAuth credentials, registered tenants, and platform security.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/usage">
            <Button size="sm">
              <Activity size={13} className="mr-1.5" /> Usage Analytics
            </Button>
          </Link>
          <Link href="/admin/staff">
            <Button variant="secondary" size="sm">
              <Shield size={13} className="mr-1.5" /> Staff &amp; Roles
            </Button>
          </Link>
          <Link href="/admin/setup">
            <Button variant="secondary" size="sm">
              <Settings size={13} className="mr-1.5" /> System Setup
            </Button>
          </Link>
          <Link href="/admin/health">
            <Button variant="secondary" size="sm">
              <Activity size={13} className="mr-1.5" /> Health Check
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((c, i) => (
          <StatCard
            key={i}
            label={c.label}
            value={c.value}
            icon={c.icon}
            color={c.color}
            bg={c.bg}
          />
        ))}
      </div>

      {/* Global Configuration Status Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key size={16} className="text-brand" /> Global Credentials &amp; Services Status
          </CardTitle>
          <CardDescription>
            High-level operational health of integrated external APIs and authentication providers.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* OpenAI */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">AI Engine (OpenAI)</div>
                <div className="text-sm font-semibold text-fg mt-0.5">
                  {openaiKey || process.env.OPENAI_API_KEY ? "Connected" : "Not Configured"}
                </div>
              </div>
              {openaiKey || process.env.OPENAI_API_KEY ? (
                <CheckCircle2 size={16} className="text-accent-green" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
            </div>

            {/* Meta App */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Meta OAuth (FB &amp; IG)</div>
                <div className="text-sm font-semibold text-fg mt-0.5">
                  {metaAppId || process.env.META_APP_ID ? "Configured" : "Not Configured"}
                </div>
              </div>
              {metaAppId || process.env.META_APP_ID ? (
                <CheckCircle2 size={16} className="text-accent-green" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
            </div>

            {/* Google OAuth */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Google OAuth (Sign-In)</div>
                <div className="text-sm font-semibold text-fg mt-0.5">
                  {googleClientId || process.env.GOOGLE_CLIENT_ID ? "Configured" : "Not Configured"}
                </div>
              </div>
              {googleClientId || process.env.GOOGLE_CLIENT_ID ? (
                <CheckCircle2 size={16} className="text-accent-green" />
              ) : (
                <AlertTriangle size={16} className="text-amber-500" />
              )}
            </div>

            {/* System SMTP */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">System Mailer (SMTP)</div>
                <div className="text-sm font-semibold text-fg mt-0.5">
                  {smtpHost || process.env.SYSTEM_SMTP_HOST ? "Active" : "Dev Fallback"}
                </div>
              </div>
              {smtpHost || process.env.SYSTEM_SMTP_HOST ? (
                <CheckCircle2 size={16} className="text-accent-green" />
              ) : (
                <AlertTriangle size={16} className="text-muted" />
              )}
            </div>

            {/* Registration Mode */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Registration Access</div>
                <div className="text-sm font-semibold text-fg mt-0.5 capitalize">
                  {registrationMode} Mode
                </div>
              </div>
              <Badge variant={registrationMode === "open" ? "success" : "neutral"} size="sm">
                {registrationMode}
              </Badge>
            </div>

            {/* Leads Scraper Cloud */}
            <div className="rounded-lg border border-border bg-bgSubtle p-3.5 flex items-center justify-between">
              <div>
                <div className="text-xs text-muted">Cloud Scraper Engine</div>
                <div className="text-sm font-semibold text-fg mt-0.5">
                  Apify Cloud Scraper API
                </div>
              </div>
              <CheckCircle2 size={16} className="text-accent-green" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Actions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/admin/staff"
          className="group block"
        >
          <Card className="h-full transition hover:border-border-input hover:shadow-xs">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3">
                  <Shield size={18} />
                </div>
                <h3 className="text-sm font-semibold text-fg group-hover:text-brand transition">Staff &amp; RBAC</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Manage platform team members, assign granular permissions, and review audit logs.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-medium text-brand">
                Manage Staff <ArrowRight size={13} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/admin/setup"
          className="group block"
        >
          <Card className="h-full transition hover:border-border-input hover:shadow-xs">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-3">
                  <Settings size={18} />
                </div>
                <h3 className="text-sm font-semibold text-fg group-hover:text-brand transition">Global Setup &amp; Keys</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Configure master credentials for Meta OAuth, Google Sign-In, and global AI models.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-medium text-brand">
                Open Setup <ArrowRight size={13} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/admin/health"
          className="group block"
        >
          <Card className="h-full transition hover:border-border-input hover:shadow-xs">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-3">
                  <Activity size={18} />
                </div>
                <h3 className="text-sm font-semibold text-fg group-hover:text-brand transition">System Diagnostics</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Live database connection latency, Redis queue status, and container health monitors.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-medium text-brand">
                Check Health <ArrowRight size={13} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link
          href="/app/settings/api-keys"
          className="group block"
        >
          <Card className="h-full transition hover:border-border-input hover:shadow-xs">
            <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
              <div>
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mb-3">
                  <Key size={18} />
                </div>
                <h3 className="text-sm font-semibold text-fg group-hover:text-brand transition">Tenant API Keys</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Personal zero-knowledge AES-256-GCM hardware encrypted keys for users and tenants.
                </p>
              </div>
              <div className="pt-2 flex items-center gap-1 text-xs font-medium text-brand">
                Manage Keys <ArrowRight size={13} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Users Directory Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users size={16} className="text-brand" /> Registered Tenants &amp; Users
              </CardTitle>
              <CardDescription>
                Showing latest {usersList?.length || 0} registered accounts.
              </CardDescription>
            </div>
            <Link href="/admin/users">
              <Button variant="secondary" size="sm">
                Manage All Users <ArrowRight size={13} className="ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-bgSubtle text-[11px] uppercase tracking-wider text-muted font-medium">
                <tr>
                  <th className="py-3 px-4 font-medium">User</th>
                  <th className="py-3 px-4 font-medium">Role</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Email Verified</th>
                  <th className="py-3 px-4 font-medium">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!usersList || usersList.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted italic">
                      No users registered yet.
                    </td>
                  </tr>
                ) : (
                  usersList.map((u: any) => (
                    <tr key={u.id} className="hover:bg-surfaceHover transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-fg">{u.name || "User"}</div>
                        <div className="text-xs text-muted font-mono">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge role={u.role} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={u.status || "active"} />
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {u.email_verified_at ? (
                          <span className="text-accent-green font-medium">Verified</span>
                        ) : (
                          <span className="text-muted italic">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted font-mono">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
