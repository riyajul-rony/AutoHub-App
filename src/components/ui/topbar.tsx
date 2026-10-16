"use client";

import React from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

export interface TopbarProps {
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  userSlot?: React.ReactNode;
  className?: string;
}

export const Topbar: React.FC<TopbarProps> = ({
  breadcrumbs,
  actions,
  userSlot,
  className = "",
}) => {
  const { setMobileOpen } = useSidebar();

  return (
    <header
      className={`sticky top-0 z-30 h-14 bg-surface border-b border-border flex items-center justify-between px-4 gap-3 ${className}`}
    >
      {/* Left: Mobile Hamburger & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setMobileOpen(true)}
          className="md:hidden p-1.5 -ml-1 rounded-[6px] text-text-subtle hover:text-text hover:bg-surface-hover transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" strokeWidth={1.5} />
        </button>

        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumbs" className="flex items-center gap-1.5 text-xs text-text-muted truncate">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 ? <span className="text-border-input select-none">/</span> : null}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-text transition-colors truncate max-w-[140px]"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="font-semibold text-text truncate max-w-[160px]">{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : null}
      </div>

      {/* Right: Actions, ThemeToggle, User */}
      <div className="flex items-center gap-2 shrink-0">
        {actions}
        <ThemeToggle />
        {userSlot}
      </div>
    </header>
  );
};

Topbar.displayName = "Topbar";
