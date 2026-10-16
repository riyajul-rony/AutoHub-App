import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subtext?: string;
  color?: string;
  bg?: string;
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  color = "text-brand",
  bg = "bg-brand/10",
  className = "",
}: StatCardProps) {
  return (
    <div className={`rounded-xl border border-border bg-surface p-5 transition hover:border-border-input ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${bg} ${color}`}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-fg">{value}</div>
      {subtext && <div className="mt-1 text-xs text-muted">{subtext}</div>}
    </div>
  );
}
