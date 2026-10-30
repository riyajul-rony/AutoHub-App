import React from "react";
import Link from "next/link";
import { ThemeToggle, Card, CardContent } from "@/components/ui";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-6 bg-bg text-text">
      {/* Top Bar with Brand & Theme Toggle */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-text text-sm tracking-tight select-none">
          <span className="w-6 h-6 rounded-[5px] bg-primary text-primary-text flex items-center justify-center text-xs font-mono font-bold">
            A
          </span>
          <span>Lead Reach AI</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Centered Auth Card */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        <Card className="border border-border bg-surface text-text">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h1 className="text-xl font-semibold tracking-tight text-text leading-tight">{title}</h1>
              {subtitle ? <p className="text-xs text-text-muted leading-normal">{subtitle}</p> : null}
            </div>

            <div>{children}</div>
          </div>
        </Card>

        {footer ? (
          <div className="mt-4 text-center text-xs text-text-muted">
            {footer}
          </div>
        ) : null}
      </div>

      {/* Bottom Copyright */}
      <div className="w-full max-w-md mx-auto text-center text-[11px] text-text-subtle">
        <span>© {new Date().getFullYear()} Cerkit Labs. All rights reserved.</span>
      </div>
    </main>
  );
}
