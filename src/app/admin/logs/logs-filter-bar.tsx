"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, RotateCcw, Filter } from "lucide-react";

interface LogsFilterBarProps {
  users: Array<{ id: string; name: string | null; email: string }>;
  currentTab: string;
}

export function LogsFilterBar({ users, currentTab }: LogsFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const range = searchParams.get("range") || "all";
  const userId = searchParams.get("userId") || "";
  const type = searchParams.get("type") || "";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // reset to page 1 on filter change
    startTransition(() => {
      router.push(`/admin/logs?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam("q", search.trim());
  };

  const handleReset = () => {
    setSearch("");
    router.push(`/admin/logs?tab=${currentTab}`);
  };

  const hasActiveFilters = Boolean(
    searchParams.get("q") ||
    searchParams.get("userId") ||
    searchParams.get("type") ||
    (searchParams.get("range") && searchParams.get("range") !== "all")
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              currentTab === "errors"
                ? "Search message, stack..."
                : currentTab === "audit"
                ? "Search action, target..."
                : "Search event, message..."
            }
            className="w-full rounded-lg border border-border bg-surface pl-8 pr-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-muted pointer-events-none" />
        </form>

        {/* Date Range Selector */}
        <div>
          <select
            value={range}
            onChange={(e) => updateParam("range", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            <option value="all">Time Range: All Records</option>
            <option value="today">Today (Last 24 Hours)</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>

        {/* User Filter */}
        <div>
          <select
            value={userId}
            onChange={(e) => updateParam("userId", e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
          >
            <option value="">User: All Users</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name ? `${u.name} (${u.email})` : u.email}
              </option>
            ))}
          </select>
        </div>

        {/* Source / Type Filter */}
        <div>
          {currentTab === "errors" ? (
            <select
              value={type}
              onChange={(e) => updateParam("type", e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="">Source: All Sources</option>
              <option value="worker.social_publish">worker.social_publish</option>
              <option value="worker.email_send">worker.email_send</option>
              <option value="worker.maintenance">worker.maintenance</option>
              <option value="api.webhook">api.webhook</option>
              <option value="system">system</option>
            </select>
          ) : (
            <input
              type="text"
              value={type}
              onChange={(e) => updateParam("type", e.target.value)}
              placeholder={currentTab === "audit" ? "Action (e.g. plan.create)" : "Type (e.g. auth.login)"}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          )}
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
          <span className="text-muted flex items-center gap-1">
            <Filter size={12} className="text-brand" /> Filter applied
          </span>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-1 text-muted hover:text-fg text-xs transition"
          >
            <RotateCcw size={12} /> Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
