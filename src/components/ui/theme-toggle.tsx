"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.getAttribute("data-theme") as "light" | "dark";
    if (current === "dark" || current === "light") {
      setTheme(current);
    } else {
      const stored = (localStorage.getItem("leadreach_theme") || localStorage.getItem("autohub_theme")) as "light" | "dark";
      const resolved = stored === "light" ? "light" : "dark";
      setTheme(resolved);
      document.documentElement.setAttribute("data-theme", resolved);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("leadreach_theme", next);
      document.cookie = `leadreach_theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {
      // Ignore quota errors
    }
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className={`w-8 h-8 rounded-[6px] border border-border bg-surface text-text-subtle flex items-center justify-center opacity-50 cursor-pointer ${className}`}
      >
        <Moon className="w-4 h-4" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
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
