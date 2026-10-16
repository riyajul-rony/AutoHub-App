"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    if (current === "dark" || current === "light") {
      setTheme(current);
    } else {
      const stored = localStorage.getItem("autohub_theme") as "light" | "dark";
      if (stored === "dark" || stored === "light") {
        setTheme(stored);
        document.documentElement.setAttribute("data-theme", stored);
      }
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("autohub_theme", next);
    } catch {
      // Ignore quota errors
    }
  };

  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className={`w-8 h-8 rounded-[6px] border border-border bg-surface text-text-subtle flex items-center justify-center opacity-50 cursor-pointer ${className}`}
      >
        <Sun className="w-4 h-4" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={`w-8 h-8 rounded-[6px] border border-border bg-surface text-text-subtle hover:text-text hover:bg-surface-hover flex items-center justify-center transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
};

ThemeToggle.displayName = "ThemeToggle";
