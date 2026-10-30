"use client";

import React, { useState, useRef, useEffect } from "react";
import { HelpCircle } from "lucide-react";

interface InfoTooltipProps {
  content: React.ReactNode;
  title?: string;
  className?: string;
  iconSize?: number;
}

export function InfoTooltip({
  content,
  title,
  className = "",
  iconSize = 13,
}: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center align-middle ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label={title || "More information"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-0.5 text-muted hover:text-primary transition-colors cursor-pointer rounded focus:outline-hidden focus:ring-1 focus:ring-primary/40"
      >
        <HelpCircle size={iconSize} className="opacity-75 hover:opacity-100" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-64 max-w-xs p-2.5 rounded-lg border border-border bg-surface shadow-xl text-fg text-[11px] leading-relaxed animate-in fade-in zoom-in-95 duration-100 pointer-events-auto"
        >
          {title && (
            <div className="font-semibold text-fg mb-1 flex items-center gap-1">
              <span>{title}</span>
            </div>
          )}
          <div className="text-muted leading-normal">{content}</div>
          {/* Subtle arrow pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-border" />
        </div>
      )}
    </div>
  );
}
