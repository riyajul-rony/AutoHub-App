"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ items, activeId, onChange, className = "" }) => {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={`flex items-center gap-1 border-b border-border overflow-x-auto no-scrollbar ${className}`}
    >
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
              isActive
                ? "text-text"
                : "text-text-muted hover:text-text hover:bg-surface-hover/50 rounded-t-[4px]"
            }`}
          >
            {tab.icon ? <span className="shrink-0">{tab.icon}</span> : null}
            <span>{tab.label}</span>
            {typeof tab.count === "number" ? (
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? "bg-primary text-primary-text" : "bg-bg-subtle text-text-subtle"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
            {isActive ? (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

Tabs.displayName = "Tabs";
