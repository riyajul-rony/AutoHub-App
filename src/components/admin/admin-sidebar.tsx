"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Settings,
  Activity,
  ArrowLeft,
  Users,
  UserCheck,
  Layers,
  BarChart3,
  CreditCard,
  Workflow,
  ScrollText,
  Menu,
  X,
  Database,
  Cloud,
} from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Shield,
  UserCheck,
  Layers,
  BarChart3,
  CreditCard,
  Workflow,
  ScrollText,
  Users,
  Settings,
  Activity,
  Database,
  Cloud,
};

interface AdminSidebarProps {
  navItems: AdminNavItem[];
  admin: {
    email: string;
    role: string;
  };
}

export function AdminSidebar({ navItems, admin }: AdminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const renderNavLinks = () => (
    <div className="space-y-0.5">
      {navItems.map((n) => {
        const IconComponent = ICON_MAP[n.icon] || Shield;
        const isActive =
          n.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(n.href);

        return (
          <Link
            key={n.href}
            id={`admin-nav-${n.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            href={n.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? "bg-bgSubtle text-fg font-semibold border border-border"
                : "text-muted hover:text-fg hover:bg-surfaceHover"
            }`}
          >
            <IconComponent size={15} className={isActive ? "text-brand" : "text-muted"} />
            <span>{n.label}</span>
          </Link>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Toggle */}
      <div className="flex md:hidden items-center justify-between border-b border-border bg-surface px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2 font-semibold text-sm">
          <div className="grid h-7 w-7 place-items-center rounded-md bg-brand/10 text-brand">
            <Shield size={16} />
          </div>
          <span>Control Center</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1 h-8 w-8"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface p-4 transition-transform duration-200 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Admin Sidebar"
      >
        {/* Brand / Logo */}
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/admin" className="flex items-center gap-2.5 font-semibold text-sm">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
              <Shield size={18} />
            </div>
            <div>
              <div className="font-bold text-sm text-fg leading-tight">Control Center</div>
              <div className="text-[10px] text-muted font-normal">Lead Reach AI</div>
            </div>
          </Link>
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileOpen(false)}
              className="p-1 h-7 w-7"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Navigation Category */}
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Administration
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto space-y-1">
          {renderNavLinks()}
        </nav>

        {/* Footer / Session Info */}
        <div className="mt-auto pt-4 border-t border-border space-y-3">
          <div className="px-3 py-2 rounded-lg bg-bgSubtle border border-border text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted uppercase font-semibold">Active Session</span>
              <StatusBadge role={admin.role} />
            </div>
            <div className="font-mono text-xs truncate text-fg" title={admin.email}>
              {admin.email}
            </div>
          </div>

          <Link href="/app" className="block">
            <Button variant="secondary" size="sm" className="w-full text-xs">
              <ArrowLeft size={13} className="mr-1.5" /> Back to User Hub
            </Button>
          </Link>
        </div>
      </aside>
    </>
  );
}
