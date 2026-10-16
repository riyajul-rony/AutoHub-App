"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle escape key on mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    };
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </SidebarContext.Provider>
  );
};

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface SidebarProps {
  sections: NavSection[];
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sections,
  header,
  footer,
  className = "",
}) => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-border select-none">
      {/* Sidebar Header / Logo */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2 overflow-hidden">
          {header || (
            <Link href="/app" className="flex items-center gap-2 font-semibold text-text text-sm tracking-tight">
              <span className="w-6 h-6 rounded-[5px] bg-primary text-primary-text flex items-center justify-center text-xs font-mono font-bold">
                A
              </span>
              {!collapsed ? <span>AutoHub</span> : null}
            </Link>
          )}
        </div>

        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden p-1 rounded text-text-subtle hover:text-text hover:bg-surface-hover"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Nav Items */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            {section.title && !collapsed ? (
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-subtle">
                {section.title}
              </p>
            ) : null}

            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/app" && item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-surface-hover text-text font-semibold border border-border/80"
                      : "text-text-muted hover:text-text hover:bg-surface-hover/60 border border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <span className="shrink-0 flex items-center text-text-subtle">{item.icon}</span>
                  {!collapsed ? (
                    <span className="flex-1 truncate leading-tight">{item.label}</span>
                  ) : null}
                  {!collapsed && item.badge ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-bg-subtle text-text-muted border border-border">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className="p-2 border-t border-border/60 shrink-0 space-y-1">
        {footer ? <div className="px-2 py-1">{footer}</div> : null}

        <button
          onClick={() => setCollapsed((prev) => !prev)}
          className={`hidden md:flex items-center gap-2 w-full px-2 py-1.5 rounded-[6px] text-xs text-text-subtle hover:text-text hover:bg-surface-hover transition-colors ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (240px or 64px) */}
      <aside
        className={`hidden md:block shrink-0 transition-[width] duration-120 ease-out z-20 ${
          collapsed ? "w-16" : "w-60"
        } ${className}`}
      >
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer (375px & below) */}
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 animate-in fade-in duration-100"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-120">
            {sidebarContent}
          </div>
        </div>
      ) : null}
    </>
  );
};

Sidebar.displayName = "Sidebar";
