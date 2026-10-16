import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  Zap,
  Globe,
  Share2,
  Mail,
  Receipt,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getUserUsageAndLimits } from "@/server/billing/limits";
import { BillingClient } from "./billing-client";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Plan & Resource Limits — AutoHub",
  description: "View your subscription tier, resource quotas, and current month usage.",
};

export default async function BillingSettingsPage() {
  const user = await requireUser();
  const limitsAndUsage = await getUserUsageAndLimits(user.id);

  // Fetch active subscription
  const activeSubscription = await db.subscriptions.findFirst({
    where: {
      user_id: user.id,
      status: { in: ["active", "trialing", "past_due"] },
    },
  }).catch(() => null);

  // Fetch recent payments / invoices for this user
  const userPayments = await db.payments.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: 10,
  }).catch(() => []);

  // Fetch all active public plans for tier comparison
  const allPlans = await db.plans.findMany({
    where: { is_active: true },
    orderBy: { monthly_price: "asc" },
  }).catch(() => []);

  const { plan, limits, overrides } = limitsAndUsage;
  const planMonthlyPrice = Number((plan as any).monthly_price ?? plan.price_monthly ?? 0);
  const planYearlyPrice = Number((plan as any).yearly_price ?? plan.price_yearly ?? 0);
  const isFree = plan.slug === "free" || planMonthlyPrice === 0;

  const plansForClient = allPlans.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_monthly: Number(p.monthly_price ?? p.price_monthly ?? 0),
    price_yearly: Number(p.yearly_price ?? p.price_yearly ?? 0),
    currency: p.currency,
    monthly_leads: Number(p.monthly_leads),
    monthly_social_posts: Number(p.monthly_social_posts),
    monthly_outreach_emails: Number(p.monthly_outreach_emails),
    max_campaigns: Number(p.max_campaigns),
    features: Array.isArray(p.features) ? p.features : [],
  }));

  const periodEnd = activeSubscription?.current_period_end
    ? new Date(activeSubscription.current_period_end)
    : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Plan & Quotas"
        description="Review your subscription features, monthly resource quotas, and platform utilization."
      />

      <SettingsNav />

      {/* Current Active Plan Overview */}
      <Card>
        <CardContent className="p-6 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge variant="accent" size="sm">
                  <Sparkles size={11} className="mr-1" /> Current Active Tier
                </Badge>
                {activeSubscription && (
                  <Badge variant={activeSubscription.status === "active" ? "success" : "warning"} size="sm">
                    {activeSubscription.status}
                  </Badge>
                )}
              </div>
              <h2 className="text-2xl font-bold text-fg">{plan.name} Plan</h2>
              <p className="text-xs text-muted">
                {plan.description || "Active automation and outreach suite subscription."}
              </p>
              {periodEnd && (
                <div className="flex items-center gap-1.5 text-xs text-muted pt-1">
                  <Calendar size={13} className="text-brand" />
                  <span>
                    {activeSubscription?.cancel_at_period_end ? "Expires on: " : "Next renewal: "}
                    <strong className="text-fg">{periodEnd.toLocaleDateString()}</strong>
                  </span>
                </div>
              )}
            </div>

            <div className="sm:text-right">
              <div className="text-3xl font-bold text-fg">
                {isFree ? "$0" : `$${planMonthlyPrice}`}
                <span className="text-xs text-muted font-normal"> / month</span>
              </div>
              {!isFree && (
                <div className="text-xs text-muted font-medium mt-0.5">
                  ${planYearlyPrice}/yr billed annually ({plan.currency})
                </div>
              )}
            </div>
          </div>

          {/* Live Quotas Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" /> Monthly Quotas &amp; Live Usage
            </h3>

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Leads */}
              <div className="rounded-lg border border-border bg-bgSubtle p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg flex items-center gap-1.5">
                    <Globe size={13} className="text-brand" /> Leads Scraped
                  </span>
                  {overrides?.monthly_leads != null && (
                    <Badge variant="neutral" size="sm">Custom</Badge>
                  )}
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted">Used:</span>
                  <span className="font-mono font-semibold text-fg">
                    {limits.monthly_leads.current} / {limits.monthly_leads.limit >= 999999 ? "Unlimited" : limits.monthly_leads.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all"
                    style={{
                      width: `${limits.monthly_leads.percentage}%`,
                    }}
                  />
                </div>
              </div>

              {/* Social Posts */}
              <div className="rounded-lg border border-border bg-bgSubtle p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg flex items-center gap-1.5">
                    <Share2 size={13} className="text-blue-500" /> Social Posts
                  </span>
                  {overrides?.monthly_social_posts != null && (
                    <Badge variant="neutral" size="sm">Custom</Badge>
                  )}
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted">Used:</span>
                  <span className="font-mono font-semibold text-fg">
                    {limits.monthly_social_posts.current} / {limits.monthly_social_posts.limit >= 999999 ? "Unlimited" : limits.monthly_social_posts.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all"
                    style={{
                      width: `${limits.monthly_social_posts.percentage}%`,
                    }}
                  />
                </div>
              </div>

              {/* Outreach Emails */}
              <div className="rounded-lg border border-border bg-bgSubtle p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-fg flex items-center gap-1.5">
                    <Mail size={13} className="text-amber-500" /> Outreach Emails
                  </span>
                  {overrides?.monthly_outreach_emails != null && (
                    <Badge variant="neutral" size="sm">Custom</Badge>
                  )}
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-muted">Used:</span>
                  <span className="font-mono font-semibold text-fg">
                    {limits.monthly_outreach_emails.current} / {limits.monthly_outreach_emails.limit >= 999999 ? "Unlimited" : limits.monthly_outreach_emails.limit.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${limits.monthly_outreach_emails.percentage}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Hard Caps */}
            <div className="grid gap-3 sm:grid-cols-3 pt-2 text-xs">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted">Connected Socials:</span>
                <span className="font-mono font-medium text-fg">
                  {limits.max_social_accounts.current} / {limits.max_social_accounts.limit}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted">Email Inboxes:</span>
                <span className="font-mono font-medium text-fg">
                  {limits.max_email_accounts.current} / {limits.max_email_accounts.limit}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
                <span className="text-muted">Active Campaigns:</span>
                <span className="font-mono font-medium text-fg">
                  {limits.max_campaigns.current} / {limits.max_campaigns.limit}
                </span>
              </div>
            </div>
          </div>

          {/* Features included */}
          {plan.features && plan.features.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <h4 className="text-xs font-medium text-muted">Plan Capabilities:</h4>
              <div className="flex flex-wrap gap-2">
                {plan.features.map((feat: string, i: number) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-bgSubtle text-xs text-fg border border-border"
                  >
                    <CheckCircle2 size={12} className="text-accent-green" />
                    {feat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison & Checkout Client */}
      <BillingClient
        plans={plansForClient}
        currentPlanSlug={plan.slug}
        activeSubscriptionId={activeSubscription?.id}
        isCanceled={Boolean(activeSubscription?.cancel_at_period_end)}
      />

      {/* Invoices & Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt size={18} className="text-brand" />
            Invoices &amp; Billing History
          </CardTitle>
          <CardDescription>
            Recent receipts and transaction status for your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          {userPayments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted space-y-2">
              <AlertCircle size={20} className="mx-auto text-muted/60" />
              <div>No invoice history available yet.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border text-muted">
                    <th className="pb-3 font-medium">Invoice #</th>
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {userPayments.map((p: any) => {
                    const dateStr = p.created_at
                      ? new Date(p.created_at).toLocaleDateString()
                      : "—";

                    return (
                      <tr key={p.id} className="hover:bg-surfaceHover transition">
                        <td className="py-3 font-mono font-medium text-fg">
                          {p.invoice_number}
                        </td>
                        <td className="py-3 text-muted">{dateStr}</td>
                        <td className="py-3 font-mono font-medium text-fg">
                          {p.currency} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 capitalize text-muted">
                          {p.method_details?.method || p.provider}
                        </td>
                        <td className="py-3">
                          {p.status === "succeeded" ? (
                            <Badge variant="success" size="sm">Paid</Badge>
                          ) : p.status === "pending" ? (
                            <Badge variant="neutral" size="sm">Pending</Badge>
                          ) : p.status === "refunded" ? (
                            <Badge variant="warning" size="sm">Refunded</Badge>
                          ) : (
                            <Badge variant="danger" size="sm">Failed</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
