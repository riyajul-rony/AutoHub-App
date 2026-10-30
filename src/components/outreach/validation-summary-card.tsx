"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, ShieldAlert, AlertTriangle, Eye, ChevronDown, ChevronUp } from "lucide-react";

export interface ValidationSummaryData {
  total: number;
  valid: number;
  duplicates: number;
  suppressed: number;
  invalidSyntax: number;
}

export interface PreviewItemData {
  email: string;
  name: string;
  company: string;
  website: string;
  status: "ready" | "duplicate" | "suppressed" | "invalid_syntax";
  reason?: string;
}

interface ValidationSummaryCardProps {
  summary: ValidationSummaryData;
  preview: PreviewItemData[];
  isLoading?: boolean;
}

export function ValidationSummaryCard({ summary, preview, isLoading }: ValidationSummaryCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (summary.total === 0 && !isLoading) {
    return null;
  }

  return (
    <div className="border border-border/80 rounded-2xl p-4 bg-surface/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-accent-green" />
          <span>Recipient Pre-flight Validation Summary</span>
        </h4>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="text-[11px] text-muted hover:text-foreground flex items-center gap-1"
        >
          {showDetails ? (
            <>
              Hide Detailed Rows <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              View Sample Leads <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {/* Total Scanned */}
        <div className="p-2.5 rounded-xl bg-surface/60 border border-border/60">
          <div className="text-[10px] text-muted font-medium">Total Scanned</div>
          <div className="text-base font-bold mt-0.5">{summary.total}</div>
        </div>

        {/* Valid & Ready */}
        <div className="p-2.5 rounded-xl bg-accent-green/10 border border-accent-green/30">
          <div className="text-[10px] text-accent-green font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </div>
          <div className="text-base font-bold text-accent-green mt-0.5">{summary.valid}</div>
        </div>

        {/* Duplicates */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
          <div className="text-[10px] text-amber-500 font-medium flex items-center gap-1">
            <Copy className="w-3 h-3" /> Duplicates
          </div>
          <div className="text-base font-bold text-amber-500 mt-0.5">{summary.duplicates}</div>
        </div>

        {/* Suppressed / Unsubscribed */}
        <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/30">
          <div className="text-[10px] text-danger font-medium flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Suppressed
          </div>
          <div className="text-base font-bold text-danger mt-0.5">{summary.suppressed}</div>
        </div>

        {/* Invalid Syntax */}
        <div className="p-2.5 rounded-xl bg-surface/60 border border-border/60 col-span-2 sm:col-span-1">
          <div className="text-[10px] text-muted font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Invalid Email
          </div>
          <div className="text-base font-bold text-muted mt-0.5">{summary.invalidSyntax}</div>
        </div>
      </div>

      {/* Safety Notice */}
      {summary.suppressed > 0 && (
        <div className="p-2.5 rounded-xl bg-danger/10 border border-danger/20 text-[11px] text-danger flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>
            {summary.suppressed} recipient(s) automatically filtered out because they previously unsubscribed or bounced.
          </span>
        </div>
      )}

      {/* Preview Table */}
      {showDetails && preview.length > 0 && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <div className="text-xs font-semibold mb-2">Sample Preview (First {preview.length} rows):</div>
          <div className="max-h-56 overflow-y-auto divide-y divide-border/40 text-xs border border-border/40 rounded-xl bg-surface/40">
            {preview.map((p, idx) => (
              <div key={idx} className="p-2.5 flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{p.email}</div>
                  <div className="text-[11px] text-muted">
                    {p.name || "No Name"} {p.company ? `• ${p.company}` : ""} {p.website ? `• ${p.website}` : ""}
                  </div>
                </div>

                <div>
                  {p.status === "ready" && (
                    <span className="badge text-[10px] border-accent-green/40 text-accent-green">
                      Ready
                    </span>
                  )}
                  {p.status === "duplicate" && (
                    <span className="badge text-[10px] border-amber-500/40 text-amber-500">
                      Duplicate (Skipped)
                    </span>
                  )}
                  {p.status === "suppressed" && (
                    <span className="badge text-[10px] border-danger/40 text-danger">
                      Suppressed
                    </span>
                  )}
                  {p.status === "invalid_syntax" && (
                    <span className="badge text-[10px] border-border text-muted">
                      Invalid Syntax
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
