"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error to console
    console.error("[Lead Reach AI Error Boundary]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 sm:p-10 shadow-sm space-y-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">
            Application Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            An unexpected error occurred while rendering this page. Our team has been notified.
          </p>
          {error?.digest && (
            <p className="text-[11px] font-mono text-muted">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            onClick={() => reset()}
            variant="primary"
            size="sm"
            className="w-full sm:w-auto inline-flex items-center gap-1.5"
          >
            <RotateCcw size={14} /> Try Again
          </Button>
          <Link href="/app/dashboard" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full inline-flex items-center gap-1.5">
              <Home size={14} /> Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
