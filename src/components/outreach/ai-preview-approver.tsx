"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, AlertCircle, RefreshCw, Eye, Edit3, Check } from "lucide-react";

export interface GeneratedPreview {
  lead: {
    name?: string;
    company?: string;
    website?: string;
    email?: string;
  };
  subject: string;
  body: string;
}

interface AiPreviewApproverProps {
  sampleLeads: Array<{
    name?: string;
    company?: string;
    website?: string;
    email?: string;
  }>;
  goalOrOffer: string;
  tone: string;
  textModel: string;
  senderName: string;
  isApproved: boolean;
  onApprovalChange: (approved: boolean, previews?: GeneratedPreview[]) => void;
}

export function AiPreviewApprover({
  sampleLeads,
  goalOrOffer,
  tone,
  textModel,
  senderName,
  isApproved,
  onApprovalChange,
}: AiPreviewApproverProps) {
  const [generating, setGenerating] = useState(false);
  const [previews, setPreviews] = useState<GeneratedPreview[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const leadsToPreview = sampleLeads.slice(0, 5);

  const handleGeneratePreviews = async () => {
    if (leadsToPreview.length === 0) {
      setErrorMsg("Please select recipients in Step 1 first.");
      return;
    }

    setGenerating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/v1/outreach/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: leadsToPreview,
          goalOrOffer,
          tone,
          textModel,
          senderName,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to generate AI previews.");
      }

      setPreviews(json.data.previews || []);
      // Reset approval when newly regenerated
      onApprovalChange(false, json.data.previews);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate previews.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = () => {
    onApprovalChange(true, previews);
  };

  const handleUpdatePreview = (idx: number, subject: string, body: string) => {
    const updated = [...previews];
    updated[idx] = { ...updated[idx], subject, body };
    setPreviews(updated);
    onApprovalChange(true, updated);
  };

  return (
    <div className="border border-border/80 rounded-2xl p-5 bg-surface/40 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand" />
            <span>AI Personalization Pre-Launch Approval (5-Lead Sample)</span>
          </h4>
          <p className="text-[11px] text-muted">
            Inspect real AI-generated copy for 5 actual prospects from your list before launching to the rest.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {previews.length > 0 && !isApproved && (
            <button
              type="button"
              onClick={handleApprove}
              className="btn btn-primary text-xs"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Approve All 5 Previews
            </button>
          )}

          {isApproved && (
            <span className="badge text-xs border-accent-green/40 bg-accent-green/10 text-accent-green font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 5/5 Previews Approved
            </span>
          )}

          <button
            type="button"
            disabled={generating}
            onClick={handleGeneratePreviews}
            className="btn btn-ghost text-xs"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                {previews.length === 0 ? "Generate 5-Lead Previews" : "Regenerate"}
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {previews.length === 0 ? (
        <div className="p-6 rounded-2xl bg-surface/30 border border-border/60 text-center space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-brand/60" />
          <div className="text-xs font-medium">No Previews Generated Yet</div>
          <p className="text-[11px] text-muted max-w-sm mx-auto">
            Click &ldquo;Generate 5-Lead Previews&rdquo; to test how the AI tailors its angle, tone, and offer to your real leads.
          </p>
        </div>
      ) : (
        <div className="space-y-3 pt-2">
          {previews.map((item, idx) => (
            <div
              key={idx}
              className={`border rounded-2xl p-4 transition-all ${
                isApproved
                  ? "border-accent-green/30 bg-accent-green/5"
                  : "border-border/80 bg-surface/50"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2 pb-2 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <span className="badge text-[10px] border-border font-mono">#{idx + 1}</span>
                  <span className="font-semibold text-foreground">
                    {item.lead.name || "Prospect"}
                  </span>
                  <span className="text-muted">•</span>
                  <span className="text-muted">{item.lead.company || "Company"}</span>
                  {item.lead.website && (
                    <>
                      <span className="text-muted">•</span>
                      <span className="text-brand text-[11px]">{item.lead.website}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEditingIdx(editingIdx === idx ? null : idx)}
                  className="text-[11px] text-muted hover:text-foreground flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" />
                  {editingIdx === idx ? "Done Editing" : "Edit Copy"}
                </button>
              </div>

              {editingIdx === idx ? (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-0.5">Subject</label>
                    <input
                      type="text"
                      value={item.subject}
                      onChange={(e) => handleUpdatePreview(idx, e.target.value, item.body)}
                      className="input w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-0.5">Body</label>
                    <textarea
                      rows={4}
                      value={item.body}
                      onChange={(e) => handleUpdatePreview(idx, item.subject, e.target.value)}
                      className="input w-full font-mono text-xs"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs">
                  <div className="font-medium text-foreground">
                    <span className="text-muted font-normal">Subject: </span>
                    {item.subject}
                  </div>
                  <div className="text-muted whitespace-pre-wrap font-mono text-[11px] p-2.5 rounded-xl bg-surface/60 border border-border/40">
                    {item.body}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Required Approval Notice */}
      {!isApproved && previews.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 flex items-center justify-between">
          <span>
            Please review the copy above and click &ldquo;Approve All 5 Previews&rdquo; to unlock campaign launch.
          </span>
          <button
            type="button"
            onClick={handleApprove}
            className="btn btn-primary text-xs py-1 px-3 ml-2 shrink-0"
          >
            <Check className="w-3.5 h-3.5 mr-1" /> Approve Now
          </button>
        </div>
      )}
    </div>
  );
}
