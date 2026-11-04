"use client";

import React from "react";
import Link from "next/link";
import { Button } from "./button";

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  actionIcon,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-[8px] border border-dashed border-border bg-surface/50 ${className}`}
    >
      <div className="w-11 h-11 rounded-[10px] bg-[var(--brand-emerald-subtle)] border border-[var(--brand-emerald-border)] flex items-center justify-center text-[var(--badge-success-text)] mb-3 shrink-0 shadow-xs">
        {icon}
      </div>
      <h4 className="text-sm font-semibold text-text leading-tight">{title}</h4>
      <p className="text-xs text-text-muted mt-1 max-w-sm leading-normal line-clamp-1">{description}</p>
      {actionLabel && (actionHref || onAction) ? (
        <div className="mt-4">
          {actionHref ? (
            <Link href={actionHref}>
              <Button variant="primary" size="sm" icon={actionIcon}>
                {actionLabel}
              </Button>
            </Link>
          ) : (
            <Button variant="primary" size="sm" onClick={onAction} icon={actionIcon}>
              {actionLabel}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
};

EmptyState.displayName = "EmptyState";
