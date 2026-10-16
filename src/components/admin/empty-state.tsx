import React from "react";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`rounded-xl p-10 text-center border border-dashed border-border bg-surface space-y-3 ${className}`}>
      <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg bg-bgSubtle border border-border text-muted">
        <Icon size={20} />
      </div>
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
