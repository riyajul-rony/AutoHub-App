"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Settings, LogOut, Shield } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/server/auth/actions";

export interface UserMenuProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    role?: string;
    avatar_url?: string | null;
  };
  isAdmin?: boolean;
}

export function UserMenu({ user, isAdmin }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user.name?.trim() || "User";
  const userInitial = displayName.charAt(0).toUpperCase();

  // Close dropdown on click outside or Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-8 h-8 rounded-[6px] border border-border bg-surface text-text hover:bg-surface-hover flex items-center justify-center text-xs font-semibold font-mono transition-all overflow-hidden focus:outline-none focus:ring-2 focus:ring-focus-ring cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Signed in as ${user.email}`}
      >
        {user.avatar_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={displayName}
            className="w-full h-full object-cover rounded-[6px]"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="w-full h-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {userInitial}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-[8px] border border-border bg-surface shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100"
        >
          {/* User Info Header */}
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[6px] border border-border overflow-hidden shrink-0 flex items-center justify-center bg-bg-subtle text-xs font-bold font-mono">
                {user.avatar_url && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-primary">{userInitial}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text truncate leading-tight">
                  {displayName}
                </p>
                <p className="text-[11px] text-text-muted truncate mt-0.5 leading-tight">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1">
            <Link
              href="/app/settings/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-text hover:bg-surface-hover transition-colors"
            >
              <User className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.5} />
              <span>Profile Settings</span>
            </Link>

            <Link
              href="/app/settings/security"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-text hover:bg-surface-hover transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-text-subtle" strokeWidth={1.5} />
              <span>Security Settings</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-accent hover:bg-surface-hover transition-colors font-medium"
              >
                <Shield className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Admin Control Center</span>
              </Link>
            )}
          </div>

          {/* Theme Mode Row */}
          <div className="border-t border-border/50 px-3 py-1.5 flex items-center justify-between text-xs text-text">
            <span className="text-text-subtle">Appearance</span>
            <ThemeToggle />
          </div>

          {/* Logout Action */}
          <div className="border-t border-border/50 pt-1">
            <form
              action={async () => {
                setIsLoggingOut(true);
                await logoutAction();
              }}
            >
              <button
                type="submit"
                disabled={isLoggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-danger hover:bg-danger/10 transition-colors cursor-pointer text-left font-medium"
              >
                <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

