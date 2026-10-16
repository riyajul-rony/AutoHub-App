import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Search,
  Filter,
  AlertCircle,
  Receipt,
  RotateCcw,
  ArrowUpRight,
  Layers,
} from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Pagination } from "@/components/pagination";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ManualPaymentDialog } from "./manual-payment-dialog";
import { CancelSubscriptionButton, RefundPaymentButton } from "./subscription-actions-menu";

export const metadata = {
  title: "Billing & Revenue — AutoHub Admin",
  description: "Monitor subscriptions, MRR, invoices, and record manual payments.",
};

interface AdminBillingPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminBillingPage({ searchParams }: AdminBillingPageProps) {
  await requirePermission("billing.manage");

  const resolvedParams = await searchParams;
  const currentTab = resolvedParams.tab === "payments" ? "payments" : "subscriptions";
  const q = resolvedParams.q?.trim() || "";
  const statusFilter = resolvedParams.status?.trim() || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const pageSize = 15;

  // 1. Fetch Financial Overview Metrics
  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Fetch all active subscriptions for MRR calculation
  const activeSubs = await db.subscriptions.findMany({
    where: { status: "active" },
    include: { plan: true },
  }).catch(() => []);

  let mrr = 0;
  const paidUserIds = new Set<string>();

  for (const sub of activeSubs as any[]) {
    const monthlyPrice = Number(sub.plan?.monthly_price ?? sub.plan?.price_monthly ?? 0);
    if (monthlyPrice > 0) {
      mrr += monthlyPrice;
      paidUserIds.add(sub.user_id);
    }
  }

  // Payments this month
  const thisMonthPayments = await db.payments.findMany({
    where: {
      status: "succeeded",
      created_at: { gte: firstDayOfMonth },
    },
    select: { amount: true },
  }).catch(() => []);

  const monthRevenue = (thisMonthPayments as any[]).reduce((acc: number, p: any) => acc + Number(p.amount || 0), 0);

  // Past due or refunded count
  const pastDueCount = await db.subscriptions.count({
    where: { status: "past_due" },
  }).catch(() => 0);

  const refundedCount = await db.payments.count({
    where: { status: "refunded" },
  }).catch(() => 0);

  // 2. Data for Manual Payment Dialog (dropdown lists)
  const allUsersForSelect = await db.users.findMany({
    take: 100,
    orderBy: { created_at: "desc" },
    select: { id: true, name: true, email: true, plan: true },
  }).catch(() => []);

  const allPlansForSelect = await db.plans.findMany({
    where: { is_active: true },
    orderBy: { monthly_price: "asc" },
    select: { id: true, name: true, slug: true, monthly_price: true, currency: true },
  }).catch(() => []);

  const planOptions = allPlansForSelect.map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price_monthly: Number(p.monthly_price ?? p.price_monthly ?? 0),
    currency: p.currency,
  }));

  // 3. Tab: Subscriptions Query
  let subscriptionsCount = 0;
  let subscriptionsList: any[] = [];

  if (currentTab === "subscriptions") {
    const whereClause: any = {};
    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (q) {
      whereClause.user = {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ],
      };
    }

    subscriptionsCount = await db.subscriptions.count({ where: whereClause }).catch(() => 0);
    subscriptionsList = await db.subscriptions.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, plan: true } },
        plan: { select: { id: true, name: true, slug: true, monthly_price: true, currency: true } },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }).catch(() => []);
  }

  // 4. Tab: Payments Query
  let paymentsCount = 0;
  let paymentsList: any[] = [];

  if (currentTab === "payments") {
    const whereClause: any = {};
    if (statusFilter) {
      whereClause.status = statusFilter;
    }
    if (q) {
      whereClause.OR = [
        { invoice_number: { contains: q, mode: "insensitive" } },
        { provider_payment_id: { contains: q, mode: "insensitive" } },
        {
          user: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      ];
    }

    paymentsCount = await db.payments.count({ where: whereClause }).catch(() => 0);
    paymentsList = await db.payments.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true } },
        subscription: {
          include: {
            plan: { select: { name: true, slug: true } },
          },
        },
      },
      orderBy: { created_at: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }).catch(() => []);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20 mb-2">
            <CreditCard size={12} />
            Financial &amp; Subscription Controls
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Billing &amp; <span className="text-brand">Revenue</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Track MRR, inspect recurring subscriptions, verify manual transfers, and manage invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ManualPaymentDialog users={allUsersForSelect} plans={planOptions} />
          <Link href="/admin/plans">
            <Button variant="secondary" size="sm">
              <Layers size={14} className="mr-1.5" /> Plan Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Revenue Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Estimated MRR"
          value={`$${mrr.toLocaleString()}`}
          icon={TrendingUp}
          subtext="Monthly recurring run rate"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          label="Revenue This Month"
          value={`$${monthRevenue.toLocaleString()}`}
          icon={DollarSign}
          subtext={`Net payments in ${now.toLocaleString("en-US", { month: "short" })}`}
          color="text-sky-600 dark:text-sky-400"
          bg="bg-sky-50 dark:bg-sky-950/40"
        />
        <StatCard
          label="Active Paid Tenants"
          value={paidUserIds.size.toLocaleString()}
          icon={Users}
          subtext="Tenants on premium plans"
          color="text-brand"
          bg="bg-brand/10"
        />
        <StatCard
          label="Past Due / Refunded"
          value={`${pastDueCount} / ${refundedCount} ref`}
          icon={AlertCircle}
          subtext="Requires follow-up"
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-50 dark:bg-amber-950/40"
        />
      </div>

      {/* Tabs & Filter Bar & Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
          {/* Tabs */}
          <div className="flex items-center gap-1.5">
            <Link
              href={`/admin/billing?tab=subscriptions${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTab === "subscriptions"
                  ? "bg-bgSubtle text-fg font-semibold border border-border"
                  : "text-muted hover:text-fg hover:bg-bgSubtle/50"
              }`}
            >
              Subscriptions ({activeSubs.length})
            </Link>
            <Link
              href={`/admin/billing?tab=payments${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                currentTab === "payments"
                  ? "bg-bgSubtle text-fg font-semibold border border-border"
                  : "text-muted hover:text-fg hover:bg-bgSubtle/50"
              }`}
            >
              Invoices &amp; Payments
            </Link>
          </div>

          {/* Search & Filter Form */}
          <form method="GET" action="/admin/billing" className="flex items-center gap-2">
            <input type="hidden" name="tab" value={currentTab} />
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder={currentTab === "subscriptions" ? "Search user name / email..." : "Search invoice # or user..."}
                className="w-52 sm:w-64 rounded-lg border border-border bg-surface pl-8 pr-3 py-1.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
              />
            </div>

            <select
              name="status"
              defaultValue={statusFilter}
              className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="">All Statuses</option>
              {currentTab === "subscriptions" ? (
                <>
                  <option value="active">Active</option>
                  <option value="past_due">Past Due</option>
                  <option value="canceled">Canceled</option>
                  <option value="expired">Expired</option>
                </>
              ) : (
                <>
                  <option value="succeeded">Succeeded</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </>
              )}
            </select>

            <Button type="submit" variant="primary" size="sm">
              <Filter size={13} />
            </Button>
            {(q || statusFilter) && (
              <Link href={`/admin/billing?tab=${currentTab}`}>
                <Button variant="ghost" size="sm" title="Reset Filters">
                  <RotateCcw size={13} />
                </Button>
              </Link>
            )}
          </form>
        </div>

        {/* TAB 1: Subscriptions Table */}
        {currentTab === "subscriptions" && (
          <>
            {subscriptionsList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-bgSubtle text-muted">
                  <CreditCard size={22} />
                </div>
                <div className="text-sm font-semibold text-fg">No subscriptions found</div>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {q || statusFilter
                    ? "No subscriptions match your query. Try clearing filters."
                    : "No subscriptions have been created yet. You can credit a user using the button above."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bgSubtle border-b border-border text-muted">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Tenant / User</th>
                      <th className="py-3 px-4 font-semibold">Plan</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Provider</th>
                      <th className="py-3 px-4 font-semibold">Current Period End</th>
                      <th className="py-3 px-4 font-semibold">Auto-Renew</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {subscriptionsList.map((s: any) => {
                      const periodEnd = new Date(s.current_period_end);
                      const isExpired = periodEnd < now;

                      return (
                        <tr key={s.id} className="hover:bg-surfaceHover transition">
                          <td className="py-3.5 px-4">
                            <Link href={`/admin/users/${s.user_id}`} className="font-semibold text-fg hover:text-brand">
                              {s.user?.name || "Unnamed"}
                            </Link>
                            <div className="text-[11px] text-muted">{s.user?.email}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant="accent">
                              {s.plan?.name || "Unknown Plan"}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4">
                            {s.status === "active" ? (
                              <Badge variant="success">Active</Badge>
                            ) : s.status === "past_due" ? (
                              <Badge variant="warning">Past Due</Badge>
                            ) : s.status === "canceled" ? (
                              <Badge variant="danger">Canceled</Badge>
                            ) : (
                              <Badge variant="danger">Expired</Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px] uppercase text-muted">
                            {s.provider}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className={`font-medium ${isExpired ? "text-red-600 dark:text-red-400" : "text-fg"}`}>
                              {periodEnd.toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-muted">
                              {isExpired ? "Expired" : `${Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days left`}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {s.cancel_at_period_end ? (
                              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Cancels at end</span>
                            ) : (
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Yes</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link href={`/admin/users/${s.user_id}`}>
                                <Button variant="ghost" size="sm" className="!p-1.5" title="View User">
                                  <ArrowUpRight size={13} />
                                </Button>
                              </Link>
                              {s.status === "active" && (
                                <CancelSubscriptionButton subscriptionId={s.id} />
                              )}
                            </div>
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
                totalCount={subscriptionsCount}
                pageSize={pageSize}
                basePath="/admin/billing"
                searchParams={{
                  tab: "subscriptions",
                  q: q || undefined,
                  status: statusFilter || undefined,
                }}
              />
            </div>
          </>
        )}

        {/* TAB 2: Invoices & Payments Table */}
        {currentTab === "payments" && (
          <>
            {paymentsList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-bgSubtle text-muted">
                  <Receipt size={22} />
                </div>
                <div className="text-sm font-semibold text-fg">No payments or invoices recorded</div>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {q || statusFilter
                    ? "No invoices match your query. Try resetting filters."
                    : "Payments will show here when users subscribe or manual payments are entered."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-bgSubtle border-b border-border text-muted">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Invoice #</th>
                      <th className="py-3 px-4 font-semibold">Tenant</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Method / Gateway</th>
                      <th className="py-3 px-4 font-semibold">Date Paid</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymentsList.map((p: any) => {
                      const paidDate = p.paid_at ? new Date(p.paid_at).toLocaleDateString() : "Pending";
                      return (
                        <tr key={p.id} className="hover:bg-surfaceHover transition">
                          <td className="py-3.5 px-4 font-mono font-semibold text-fg">
                            {p.invoice_number}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-fg">{p.user?.name || "User"}</div>
                            <div className="text-[11px] text-muted">{p.user?.email}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-fg">
                            {p.currency} {Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-fg capitalize">
                              {p.method_details?.method || p.provider}
                            </div>
                            {p.provider_payment_id && (
                              <div className="text-[10px] text-muted font-mono truncate max-w-[130px]">
                                {p.provider_payment_id}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-muted">
                            {paidDate}
                          </td>

                          <td className="py-3.5 px-4">
                            {p.status === "succeeded" ? (
                              <Badge variant="success">Succeeded</Badge>
                            ) : p.status === "refunded" ? (
                              <Badge variant="neutral">Refunded</Badge>
                            ) : p.status === "pending" ? (
                              <Badge variant="warning">Pending</Badge>
                            ) : (
                              <Badge variant="danger">Failed</Badge>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {p.status === "succeeded" && (
                              <RefundPaymentButton paymentId={p.id} />
                            )}
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
                totalCount={paymentsCount}
                pageSize={pageSize}
                basePath="/admin/billing"
                searchParams={{
                  tab: "payments",
                  q: q || undefined,
                  status: statusFilter || undefined,
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
