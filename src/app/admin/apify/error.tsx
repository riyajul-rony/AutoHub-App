"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminApifyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Admin Apify Error Boundary]", error);
  }, [error]);

  return (
    <div className="space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={24} />
            Apify Management Error
          </h1>
          <p className="text-sm text-muted mt-1">
            An error occurred while loading or rendering the Apify service management page.
          </p>
        </div>
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Back to Admin
          </Button>
        </Link>
      </div>

      <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
            <Bug size={20} />
          </div>
          <div className="space-y-1 flex-1">
            <h3 className="text-sm font-semibold text-fg">
              {error.name || "Render Error"}: {error.message || "An unexpected error occurred"}
            </h3>
            {error.digest && (
              <p className="text-xs font-mono text-muted">Digest: {error.digest}</p>
            )}
          </div>
        </div>

        {error.stack && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-muted uppercase tracking-wider">
              Diagnostic Stack Trace (Admin / Dev Mode)
            </div>
            <pre className="p-4 rounded-lg bg-bg border border-border text-[11px] font-mono text-fg overflow-x-auto whitespace-pre-wrap max-h-80">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <Button onClick={() => reset()} variant="primary" size="sm" className="inline-flex items-center gap-1.5">
            <RotateCcw size={14} /> Try Again
          </Button>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
          >
            Hard Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}
