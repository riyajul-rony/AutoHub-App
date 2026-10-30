import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { UsersTable, UserRow } from "./users-table";
import { Users, UserCheck, UserX, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Users Management — Lead Reach AI Admin",
  description: "Manage registered tenants, access privileges, subscription plans, and account security.",
};

interface AdminUsersPageProps {
  searchParams: Promise<{
    search?: string;
    status?: string;
    role?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  await requirePermission("users.read");

  const sp = await searchParams;
  const search = (sp.search || "").trim();
  const status = sp.status || "all";
  const role = sp.role || "all";
  const sort = sp.sort || "created_at";
  const order = sp.order === "asc" ? "asc" : "desc";
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const pageSize = 25;

  const where: any = {};
  if (status !== "all") {
    where.status = status;
  }
  if (role !== "all") {
    where.role = role;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  // 1. Fetch paginated records and total matching count
  const [rawUsers, totalCount, activeCount, suspendedCount, pendingDeleteCount] = await Promise.all([
    db.users.findMany({
      where,
      take: pageSize,
      skip: (page - 1) * pageSize,
      orderBy: { [sort]: order },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        plan: true,
        created_at: true,
        last_login_at: true,
        email_verified_at: true,
      },
    }),
    db.users.count({ where }),
    db.users.count({ where: { status: "active" } }).catch(() => 0),
    db.users.count({ where: { status: "suspended" } }).catch(() => 0),
    db.users.count({ where: { status: "pending_delete" } }).catch(() => 0),
  ]);

  const userRows: UserRow[] = (rawUsers || []).map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    plan: u.plan || "free",
    created_at: u.created_at,
    last_login_at: u.last_login_at,
    email_verified_at: u.email_verified_at,
  }));

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              Directory &amp; Tenants
            </Badge>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl text-fg">
            Users &amp; Tenants
          </h1>
          <p className="mt-1 text-xs text-muted max-w-2xl">
            Inspect customer accounts, review usage metrics, enforce account suspensions, and manage subscription tiers.
          </p>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Registered"
          value={totalCount.toLocaleString()}
          icon={Users}
          color="text-brand"
          bg="bg-brand/10"
          subtext="All platform accounts"
        />
        <StatCard
          label="Active Accounts"
          value={activeCount.toLocaleString()}
          icon={UserCheck}
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
          subtext="Operational and verified"
        />
        <StatCard
          label="Suspended Users"
          value={suspendedCount.toLocaleString()}
          icon={UserX}
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
          subtext="Blocked and campaigns paused"
        />
        <StatCard
          label="Pending Deletion"
          value={pendingDeleteCount.toLocaleString()}
          icon={AlertTriangle}
          color="text-red-600 dark:text-red-400"
          bg="bg-red-500/10"
          subtext="Scheduled for soft-delete"
        />
      </div>

      {/* Main Table with Server-side Queries */}
      <UsersTable
        users={userRows}
        totalCount={totalCount}
        currentPage={page}
        pageSize={pageSize}
        currentSearch={search}
        currentStatus={status}
        currentRole={role}
        currentSort={sort}
        currentOrder={order}
      />
    </div>
  );
}
