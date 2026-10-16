"use client";

import { useState } from "react";
import { Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { runLogPurgeAction } from "./log-actions";
import { Button } from "@/components/ui/button";

export function PurgeLogsButton() {
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handlePurge = async () => {
    const ok = window.confirm(
      "Are you sure you want to run the 90-day retention cleanup?\n\nThis will permanently delete all activity logs, admin audit logs, and error logs older than 90 days."
    );
    if (!ok) return;

    setLoading(true);
    setResultMsg(null);
    try {
      const res = await runLogPurgeAction();
      const r = res.result;
      const total = (r?.activityLogsDeleted || 0) + (r?.auditLogsDeleted || 0) + (r?.errorLogsDeleted || 0);
      setResultMsg(`Purged ${total} log(s) older than 90 days`);
      setTimeout(() => setResultMsg(null), 5000);
    } catch (err: any) {
      alert("Purge failed: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {resultMsg && (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 font-medium bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-900/60">
          <CheckCircle2 size={13} /> {resultMsg}
        </span>
      )}
      <Button
        onClick={handlePurge}
        disabled={loading}
        variant="secondary"
        size="sm"
        className="text-xs text-muted hover:text-red-600 dark:hover:text-red-400"
        title="Delete logs older than 90 days according to data retention policy"
      >
        {loading ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Trash2 size={13} className="mr-1.5" />}
        <span>{loading ? "Purging..." : "Retention Purge (90+ Days)"}</span>
      </Button>
    </div>
  );
}
