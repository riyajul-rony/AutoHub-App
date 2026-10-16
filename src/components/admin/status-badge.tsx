import React from "react";
import { ROLE_LABELS } from "@/server/auth/permissions";

interface StatusBadgeProps {
  role?: string | null;
  status?: string | null;
  className?: string;
}

export function StatusBadge({ role, status, className = "" }: StatusBadgeProps) {
  if (role) {
    const roleStyles: Record<string, string> = {
      super_admin: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/25 font-semibold",
      admin: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25 font-semibold",
      support: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25 font-semibold",
      finance: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25 font-semibold",
      user: "bg-bgSubtle text-muted border-border font-medium",
    };

    const style = roleStyles[role] || "bg-bgSubtle text-muted border-border";
    const label = ROLE_LABELS[role] || role;

    return (
      <span className={`inline-flex items-center text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider ${style} ${className}`}>
        {label}
      </span>
    );
  }

  if (status) {
    const statusStyles: Record<string, { dot: string; text: string; bg: string }> = {
      active: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
      suspended: { dot: "bg-red-500", text: "text-red-700 dark:text-red-400", bg: "bg-red-500/10 border-red-500/25" },
      pending_delete: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-500/25" },
      verified: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" },
      pending: { dot: "bg-muted", text: "text-muted", bg: "bg-bgSubtle border-border" },
    };

    const s = statusStyles[status] || { dot: "bg-muted", text: "text-muted", bg: "bg-bgSubtle border-border" };

    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full border ${s.bg} ${s.text} font-medium ${className}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        <span className="capitalize">{status.replace("_", " ")}</span>
      </span>
    );
  }

  return null;
}
