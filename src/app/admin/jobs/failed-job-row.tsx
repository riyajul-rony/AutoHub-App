"use client";

import React, { useState } from "react";
import { RotateCcw, Trash2, ChevronDown, ChevronUp, Loader2, AlertCircle } from "lucide-react";
import { FailedJobItem } from "@/server/queues/manager";
import { retryJobAction, removeJobAction } from "./job-actions";
import { Button } from "@/components/ui/button";

export function FailedJobRow({ job }: { job: FailedJobItem }) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await retryJobAction(job.queueName, job.id);
      if (!res.success) alert(res.error || "Retry failed");
    } catch (err: any) {
      alert(err.message || "Failed to retry");
    } finally {
      setRetrying(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm("Remove this failed job permanently from queue?")) return;
    setRemoving(true);
    try {
      const res = await removeJobAction(job.queueName, job.id);
      if (!res.success) alert(res.error || "Remove failed");
    } catch (err: any) {
      alert(err.message || "Failed to remove");
    } finally {
      setRemoving(false);
    }
  };

  const dateStr = new Date(job.timestamp).toLocaleString();

  return (
    <>
      <tr className="hover:bg-surfaceHover transition text-xs">
        {/* Job ID & Queue */}
        <td className="py-3.5 px-4">
          <div className="font-mono font-semibold text-fg">{job.id}</div>
          <div className="text-[11px] text-muted capitalize">{job.queueName} &bull; {job.name}</div>
        </td>

        {/* User */}
        <td className="py-3.5 px-4">
          {job.userEmail ? (
            <div>
              <div className="font-medium text-fg">{job.userName || "User"}</div>
              <div className="text-[11px] text-muted">{job.userEmail}</div>
            </div>
          ) : (
            <span className="text-muted font-mono">{job.userId || "System / Unspecified"}</span>
          )}
        </td>

        {/* Error Message */}
        <td className="py-3.5 px-4 max-w-xs truncate">
          <div className="text-red-600 dark:text-red-400 font-medium truncate" title={job.failedReason}>
            {job.failedReason || "Unknown failure"}
          </div>
          <div className="text-[10px] text-muted">Attempts: {job.attemptsMade}</div>
        </td>

        {/* Failed At */}
        <td className="py-3.5 px-4 text-muted">
          {dateStr}
        </td>

        {/* Actions */}
        <td className="py-3.5 px-4 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Button
              onClick={() => setExpanded(!expanded)}
              variant="ghost"
              size="sm"
              className="!p-1.5"
              title={expanded ? "Hide Details" : "Inspect Stack & Data"}
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </Button>

            <Button
              onClick={handleRetry}
              disabled={retrying || removing}
              variant="ghost"
              size="sm"
              className="!p-1.5 text-brand hover:bg-brand/10"
              title="Retry Job"
            >
              {retrying ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
            </Button>

            <Button
              onClick={handleRemove}
              disabled={retrying || removing}
              variant="ghost"
              size="sm"
              className="!p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              title="Remove Job"
            >
              {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </Button>
          </div>
        </td>
      </tr>

      {expanded && (
        <tr className="bg-bgSubtle/40">
          <td colSpan={5} className="p-4 border-b border-border space-y-3">
            <div>
              <div className="text-[11px] font-bold text-red-700 dark:text-red-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <AlertCircle size={13} /> Failure Stacktrace
              </div>
              <pre className="p-3 rounded-lg bg-surface border border-border font-mono text-[11px] text-red-800 dark:text-red-300 whitespace-pre-wrap max-h-48 overflow-y-auto">
                {job.stacktrace && job.stacktrace.length > 0
                  ? job.stacktrace.join("\n")
                  : job.failedReason || "No stack trace recorded."}
              </pre>
            </div>

            <div>
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">
                Payload / Job Data
              </div>
              <pre className="p-3 rounded-lg bg-surface border border-border font-mono text-[11px] text-muted whitespace-pre-wrap max-h-48 overflow-y-auto">
                {JSON.stringify(job.data, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
