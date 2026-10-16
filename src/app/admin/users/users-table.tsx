"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowRight,
  User,
  Shield,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/admin/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  plan: string;
  created_at: string | Date;
  last_login_at: string | Date | null;
  email_verified_at: string | Date | null;
}

interface UsersTableProps {
  users: UserRow[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  currentSearch: string;
  currentStatus: string;
  currentRole: string;
  currentSort: string;
  currentOrder: string;
}

export function UsersTable({
  users,
  totalCount,
  currentPage,
  pageSize,
  currentSearch,
  currentStatus,
  currentRole,
  currentSort,
  currentOrder,
}: UsersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(currentSearch);

  function updateQuery(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === "all") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    if (!("page" in updates)) {
      params.delete("page");
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateQuery({ search: searchInput.trim() });
  }

  function handleResetFilters() {
    setSearchInput("");
    startTransition(() => {
      router.push(pathname);
    });
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasActiveFilters = Boolean(currentSearch || currentStatus !== "all" || currentRole !== "all" || currentSort !== "created_at");

  const startRecord = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalCount);

  function getPlanBadge(plan: string) {
    const p = (plan || "free").toLowerCase();
    switch (p) {
      case "enterprise":
        return <Badge variant="warning" size="sm">Enterprise</Badge>;
      case "pro":
      case "professional":
        return <Badge variant="accent" size="sm">Pro</Badge>;
      case "starter":
        return <Badge variant="neutral" size="sm">Starter</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Free</Badge>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filters Bar */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            id="users-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full h-9 rounded-md border border-border-input bg-surface pl-8 pr-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 placeholder:text-muted"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-bgSubtle border border-border rounded-md px-2.5 h-9">
            <Filter size={13} className="text-muted" />
            <select
              id="users-status-filter"
              value={currentStatus}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="bg-transparent text-xs font-medium text-fg focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_delete">Pending Delete</option>
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-bgSubtle border border-border rounded-md px-2.5 h-9">
            <Shield size={13} className="text-muted" />
            <select
              id="users-role-filter"
              value={currentRole}
              onChange={(e) => updateQuery({ role: e.target.value })}
              className="bg-transparent text-xs font-medium text-fg focus:outline-none cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="support">Support</option>
              <option value="finance">Finance</option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-1.5 bg-bgSubtle border border-border rounded-md px-2.5 h-9">
            <ArrowUpDown size={13} className="text-muted" />
            <select
              id="users-sort-filter"
              value={`${currentSort}:${currentOrder}`}
              onChange={(e) => {
                const [sort, order] = e.target.value.split(":");
                updateQuery({ sort, order });
              }}
              className="bg-transparent text-xs font-medium text-fg focus:outline-none cursor-pointer"
            >
              <option value="created_at:desc">Joined: Newest First</option>
              <option value="created_at:asc">Joined: Oldest First</option>
              <option value="last_login_at:desc">Last Active: Recent First</option>
              <option value="name:asc">Name: A to Z</option>
              <option value="email:asc">Email: A to Z</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              title="Reset all filters"
              className="h-9 px-2.5"
            >
              <RotateCcw size={13} />
            </Button>
          )}
        </div>
      </div>

      {/* Users Data Table */}
      <div className={`rounded-xl border border-border bg-surface overflow-hidden transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-bgSubtle text-[11px] font-medium uppercase tracking-wider text-muted">
              <tr>
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Joined Date</th>
                <th className="py-3 px-4 font-medium">Last Login</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState
                      icon={User}
                      title="No users match your criteria"
                      description={hasActiveFilters ? "Try clearing search keywords or filter selections." : "No registered users in the platform."}
                      action={
                        hasActiveFilters ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleResetFilters}
                          >
                            Clear All Filters
                          </Button>
                        ) : undefined
                      }
                    />
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-surfaceHover transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand font-semibold text-xs uppercase shrink-0">
                          {u.name ? u.name.charAt(0) : u.email.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-fg flex items-center gap-1.5">
                            <span className="truncate max-w-[200px]">{u.name || "Unnamed"}</span>
                            {u.email_verified_at && (
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-green" title="Email Verified" />
                            )}
                          </div>
                          <div className="text-xs text-muted font-mono truncate max-w-[220px]">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge role={u.role} />
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-3.5 px-4">
                      {getPlanBadge(u.plan)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted font-mono whitespace-nowrap">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted font-mono whitespace-nowrap">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        id={`user-detail-link-${u.id}`}
                        href={`/admin/users/${u.id}`}
                      >
                        <Button variant="ghost" size="sm">
                          Details <ArrowRight size={12} className="ml-1" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted">
          <div>
            Showing <span className="font-semibold text-fg">{startRecord}</span> to{" "}
            <span className="font-semibold text-fg">{endRecord}</span> of{" "}
            <span className="font-semibold text-fg">{totalCount}</span> users
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              id="users-prev-page-btn"
              disabled={currentPage <= 1 || isPending}
              onClick={() => updateQuery({ page: String(currentPage - 1) })}
            >
              <ChevronLeft size={13} className="mr-1" /> Previous
            </Button>
            <span className="px-2 text-xs font-mono">
              Page <span className="text-fg font-semibold">{currentPage}</span> of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              id="users-next-page-btn"
              disabled={currentPage >= totalPages || isPending}
              onClick={() => updateQuery({ page: String(currentPage + 1) })}
            >
              Next <ChevronRight size={13} className="ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
