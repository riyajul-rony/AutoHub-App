import Link from "next/link";
import { ScrollText, Activity, ShieldCheck, AlertTriangle } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Pagination } from "@/components/pagination";
import { LogsFilterBar } from "./logs-filter-bar";
import { LogsTableView } from "./logs-table-view";
import { PurgeLogsButton } from "./purge-button";

export const metadata = {
  title: "System Logs & Audit Trail — Lead Reach AI Admin",
  description: "Comprehensive activity logs, administrative audit trails, and worker runtime errors.",
};

interface AdminLogsPageProps {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    range?: string;
    type?: string;
    userId?: string;
    page?: string;
  }>;
}

export default async function AdminLogsPage({ searchParams }: AdminLogsPageProps) {
  // Permission Guard
  await requirePermission("logs.read");

  const sp = await searchParams;
  const tab = (sp.tab === "audit" || sp.tab === "errors" ? sp.tab : "activity") as
    | "activity"
    | "audit"
    | "errors";
  const search = (sp.q || "").trim();
  const range = sp.range || "all";
  const type = (sp.type || "").trim();
  const userId = (sp.userId || "").trim();
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const pageSize = 20;

  // Compute cutoff date
  let cutoffDate: Date | null = null;
  const now = new Date();
  if (range === "today") {
    cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  } else if (range === "7d") {
    cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "30d") {
    cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else if (range === "90d") {
    cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  }

  // Fetch users for dropdown and tab summary counts
  const [users, activityCount, auditCount, unresolvedErrorsCount] = await Promise.all([
    db.users
      .findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: "asc" },
        take: 100,
      })
      .catch(() => []),
    db.activity_logs.count().catch(() => 0),
    db.admin_audit_logs.count().catch(() => 0),
    db.error_logs.count({ where: { resolved_at: null } }).catch(() => 0),
  ]);

  let logs: any[] = [];
  let totalCount = 0;

  if (tab === "activity") {
    const where: any = {};
    if (cutoffDate) where.created_at = { gte: cutoffDate };
    if (userId) where.user_id = userId;
    if (type) where.type = type;

    // Fetch items with pagination
    const [fetchedLogs, count] = await Promise.all([
      db.activity_logs
        .findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { created_at: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
        .catch(() => []),
      db.activity_logs.count({ where }).catch(() => 0),
    ]);

    logs = fetchedLogs;
    totalCount = count;

    // Apply text search filtering if specified
    if (search) {
      const qLower = search.toLowerCase();
      logs = logs.filter(
        (l: any) =>
          l.message?.toLowerCase().includes(qLower) ||
          l.type?.toLowerCase().includes(qLower) ||
          l.user?.email?.toLowerCase().includes(qLower) ||
          l.user?.name?.toLowerCase().includes(qLower)
      );
    }
  } else if (tab === "audit") {
    const where: any = {};
    if (cutoffDate) where.created_at = { gte: cutoffDate };
    if (userId) where.admin_id = userId;
    if (type) where.action = type;

    const [fetchedLogs, count] = await Promise.all([
      db.admin_audit_logs
        .findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { created_at: "desc" },
          include: { admin: { select: { id: true, name: true, email: true } } },
        })
        .catch(() => []),
      db.admin_audit_logs.count({ where }).catch(() => 0),
    ]);

    logs = fetchedLogs;
    totalCount = count;

    if (search) {
      const qLower = search.toLowerCase();
      logs = logs.filter(
        (l: any) =>
          l.action?.toLowerCase().includes(qLower) ||
          l.target_type?.toLowerCase().includes(qLower) ||
          l.target_id?.toLowerCase().includes(qLower) ||
          l.admin?.email?.toLowerCase().includes(qLower)
      );
    }
  } else if (tab === "errors") {
    const where: any = {};
    if (cutoffDate) where.created_at = { gte: cutoffDate };
    if (userId) where.user_id = userId;
    if (type) where.source = type;

    const [fetchedLogs, count] = await Promise.all([
      db.error_logs
        .findMany({
          where,
          take: pageSize,
          skip: (page - 1) * pageSize,
          orderBy: { created_at: "desc" },
          include: { user: { select: { id: true, name: true, email: true } } },
        })
        .catch(() => []),
      db.error_logs.count({ where }).catch(() => 0),
    ]);

    logs = fetchedLogs;
    totalCount = count;

    if (search) {
      const qLower = search.toLowerCase();
      logs = logs.filter(
        (l: any) =>
          l.message?.toLowerCase().includes(qLower) ||
          l.source?.toLowerCase().includes(qLower) ||
          l.stack?.toLowerCase().includes(qLower) ||
          l.user?.email?.toLowerCase().includes(qLower)
      );
    }
  }

  // Build pagination searchParams dict
  const cleanSearchParams: Record<string, string | undefined> = {
    tab,
    q: search || undefined,
    range: range !== "all" ? range : undefined,
    type: type || undefined,
    userId: userId || undefined,
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            <ScrollText className="text-brand" size={26} /> System Logs &amp; Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Real-time audit log aggregation, user activities, and worker error diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PurgeLogsButton />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-border gap-1 overflow-x-auto pb-px">
        <Link
          href={`/admin/logs?tab=activity${range !== "all" ? `&range=${range}` : ""}`}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
            tab === "activity"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-fg hover:bg-bgSubtle"
          }`}
        >
          <Activity size={14} />
          <span>Activity Logs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-bgSubtle text-fg font-mono">
            {activityCount}
          </span>
        </Link>

        <Link
          href={`/admin/logs?tab=audit${range !== "all" ? `&range=${range}` : ""}`}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
            tab === "audit"
              ? "border-amber-600 dark:border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-500/10"
              : "border-transparent text-muted hover:text-fg hover:bg-bgSubtle"
          }`}
        >
          <ShieldCheck size={14} />
          <span>Admin Audit Logs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-bgSubtle text-fg font-mono">
            {auditCount}
          </span>
        </Link>

        <Link
          href={`/admin/logs?tab=errors${range !== "all" ? `&range=${range}` : ""}`}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
            tab === "errors"
              ? "border-rose-600 dark:border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-500/10"
              : "border-transparent text-muted hover:text-fg hover:bg-bgSubtle"
          }`}
        >
          <AlertTriangle size={14} />
          <span>Error Logs</span>
          {unresolvedErrorsCount > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-mono font-bold border border-rose-200 dark:border-rose-900/40">
              {unresolvedErrorsCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-bgSubtle text-muted font-mono">
              0
            </span>
          )}
        </Link>
      </div>

      {/* Filter Bar */}
      <LogsFilterBar users={users} currentTab={tab} />

      {/* Logs Table */}
      <LogsTableView tab={tab} logs={logs} />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalCount={totalCount}
        pageSize={pageSize}
        basePath="/admin/logs"
        searchParams={cleanSearchParams}
      />
    </div>
  );
}
