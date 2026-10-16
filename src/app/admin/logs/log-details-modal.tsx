"use client";

import { useState } from "react";
import { X, Copy, Check, AlertTriangle, CheckCircle2 } from "lucide-react";
import { resolveErrorLogAction } from "./log-actions";
import { Button } from "@/components/ui/button";

export interface LogDetailItem {
  id: string;
  type: "activity" | "audit" | "error";
  title: string;
  timestamp: string;
  userEmail?: string | null;
  userName?: string | null;
  sourceOrAction?: string;
  message?: string;
  stack?: string | null;
  context?: any;
  meta?: any;
  beforeState?: any;
  afterState?: any;
  resolvedAt?: string | null;
}

interface LogDetailsModalProps {
  item: LogDetailItem | null;
  onClose: () => void;
}

export function LogDetailsModal({ item, onClose }: LogDetailsModalProps) {
  const [copied, setCopied] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(!!item?.resolvedAt);

  if (!item) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResolve = async () => {
    if (!item.id) return;
    setIsResolving(true);
    try {
      await resolveErrorLogAction(item.id);
      setIsResolved(true);
    } catch (err: any) {
      alert("Failed to resolve error: " + (err?.message || "Unknown error"));
    } finally {
      setIsResolving(false);
    }
  };

  const hasJsonContext = item.context && Object.keys(item.context).length > 0;
  const hasMeta = item.meta && Object.keys(item.meta).length > 0;
  const hasDiff = item.beforeState !== undefined || item.afterState !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="max-w-2xl w-full rounded-xl border border-border bg-surface shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2.5">
            <span
              className={`grid h-8 w-8 place-items-center rounded-lg text-white font-bold text-xs ${
                item.type === "error"
                  ? "bg-rose-600"
                  : item.type === "audit"
                  ? "bg-amber-600"
                  : "bg-blue-600"
              }`}
            >
              {item.type === "error" ? "ERR" : item.type === "audit" ? "AUD" : "ACT"}
            </span>
            <div>
              <h3 className="text-base font-semibold text-fg">{item.title}</h3>
              <p className="text-xs text-muted">
                {new Date(item.timestamp).toLocaleString()} &bull; ID:{" "}
                <span className="font-mono text-[11px]">{item.id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-fg hover:bg-bgSubtle transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Metadata badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {item.userEmail && (
              <div className="p-3 rounded-lg bg-bgSubtle border border-border">
                <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">
                  Associated Account
                </span>
                <span className="font-medium text-fg">{item.userName || "User"}</span>
                <span className="text-muted block font-mono text-[11px] truncate">
                  {item.userEmail}
                </span>
              </div>
            )}
            {item.sourceOrAction && (
              <div className="p-3 rounded-lg bg-bgSubtle border border-border">
                <span className="text-[10px] uppercase font-semibold text-muted block mb-0.5">
                  Category / Source
                </span>
                <span className="font-mono font-medium text-brand">
                  {item.sourceOrAction}
                </span>
              </div>
            )}
          </div>

          {/* Error Message */}
          {item.message && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Log Message
              </label>
              <div className="p-3 rounded-lg bg-bgSubtle border border-border text-xs text-fg leading-relaxed">
                {item.message}
              </div>
            </div>
          )}

          {/* Audit Diff: Before vs After */}
          {hasDiff && (
            <div className="space-y-3">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider block">
                State Snapshot Diff
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted font-medium">Before:</span>
                  <pre className="p-3 rounded-lg bg-bgSubtle border border-border overflow-x-auto text-[11px] font-mono text-fg max-h-48">
                    {item.beforeState
                      ? JSON.stringify(item.beforeState, null, 2)
                      : "null (Created new entity)"}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="text-[11px] text-muted font-medium">After:</span>
                  <pre className="p-3 rounded-lg bg-bgSubtle border border-border overflow-x-auto text-[11px] font-mono text-fg max-h-48">
                    {item.afterState
                      ? JSON.stringify(item.afterState, null, 2)
                      : "null (Deleted entity)"}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Context JSON */}
          {hasJsonContext && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Runtime Context
                </label>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(item.context, null, 2))}
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg transition"
                >
                  {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-bgSubtle border border-border overflow-x-auto text-[11px] font-mono text-fg max-h-48">
                {JSON.stringify(item.context, null, 2)}
              </pre>
            </div>
          )}

          {/* Activity Meta */}
          {hasMeta && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                  Event Meta
                </label>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(item.meta, null, 2))}
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg transition"
                >
                  {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy JSON"}</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-bgSubtle border border-border overflow-x-auto text-[11px] font-mono text-fg max-h-48">
                {JSON.stringify(item.meta, null, 2)}
              </pre>
            </div>
          )}

          {/* Error Stack Trace */}
          {item.stack && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={13} /> Stack Trace
                </label>
                <button
                  onClick={() => copyToClipboard(item.stack!)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-fg transition"
                >
                  {copied ? <Check size={12} className="text-emerald-600 dark:text-emerald-400" /> : <Copy size={12} />}
                  <span>{copied ? "Copied" : "Copy Trace"}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 overflow-x-auto text-[11px] font-mono text-rose-800 dark:text-rose-300 leading-relaxed max-h-60">
                {item.stack}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border flex items-center justify-between bg-bgSubtle/50">
          <div>
            {item.type === "error" && (
              isResolved ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 size={15} /> Marked as Resolved
                </span>
              ) : (
                <Button
                  onClick={handleResolve}
                  disabled={isResolving}
                  variant="secondary"
                  size="sm"
                  className="text-emerald-700 dark:text-emerald-400"
                >
                  {isResolving ? "Resolving..." : "Mark as Resolved"}
                </Button>
              )
            )}
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
