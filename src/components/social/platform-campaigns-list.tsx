"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Pause, Play, Trash2, Sparkles, ExternalLink, Clock, CheckCircle2, AlertCircle } from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  status: "active" | "paused" | "ended";
  business_name?: string;
  business_category?: string;
  brand_voice?: string;
  post_times: string[];
  approval_mode: "auto" | "approve";
  social_account?: {
    display_name: string;
    external_id: string;
  };
}

export function PlatformCampaignsList({ provider }: { provider: string }) {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const platformName = provider.charAt(0).toUpperCase() + provider.slice(1);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`/api/v1/social/campaigns?provider=${provider}`);
      const data = await res.json();
      if (data.data) {
        setCampaigns(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [provider]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    try {
      const res = await fetch(`/api/v1/social/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: newStatus as any } : c))
        );
        setStatusNotice(`Campaign is now ${newStatus.toUpperCase()}`);
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      alert("Failed to update status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete campaign "${name}"?`)) return;
    try {
      const res = await fetch(`/api/v1/social/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== id));
        setStatusNotice("Campaign deleted");
        setTimeout(() => setStatusNotice(null), 3000);
      }
    } catch {
      alert("Failed to delete campaign");
    }
  };

  const handleGeneratePostNow = async (campaignId: string) => {
    setGeneratingId(campaignId);
    setStatusNotice(null);
    try {
      const res = await fetch("/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId }),
      });
      const data = await res.json();
      if (data.data) {
        setStatusNotice("AI Post generated! Sent to Post History & Approval Queue.");
      } else {
        setStatusNotice("Post generated successfully.");
      }
      setTimeout(() => setStatusNotice(null), 4000);
    } catch {
      alert("Failed to generate post");
    } finally {
      setGeneratingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {statusNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            {statusNotice}
          </span>
          <Link href="/app/social/history" className="font-semibold underline ml-2">
            View Approval Queue →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="glass rounded-3xl p-12 text-center text-xs text-muted">
          Loading {platformName} campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center space-y-4 border border-border">
          <div className="w-14 h-14 rounded-3xl bg-brand/20 text-brand flex items-center justify-center mx-auto">
            <Sparkles size={28} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No {platformName} Campaigns Found</h3>
            <p className="text-xs text-muted max-w-md mx-auto mt-1 leading-relaxed">
              Create your first automated {platformName} campaign to generate and publish AI captions, hashtags, and branded visuals according to your schedule.
            </p>
          </div>
          <Link
            href={`/app/social/${provider}/new`}
            className="btn btn-primary text-xs inline-flex items-center gap-2 shadow-lg shadow-brand/20 font-bold !px-5"
          >
            <Plus size={16} /> Create First {platformName} Campaign
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="glass rounded-3xl p-6 border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-brand/40 transition duration-150"
            >
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-base text-white">{c.name}</span>
                  {c.status === "active" ? (
                    <span className="badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  ) : (
                    <span className="badge border-amber-500/40 text-amber-400 bg-amber-500/10 text-xs">
                      Paused
                    </span>
                  )}
                  <span className="badge text-[11px]">
                    {c.approval_mode === "auto" ? "Hands-Free Auto Post" : "Manual Approval"}
                  </span>
                </div>

                <div className="text-xs text-muted flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-brand-2" />
                    Posts daily at {c.post_times?.join(", ") || "10:00"}
                  </span>
                  {c.social_account && (
                    <span>• Target: <strong>{c.social_account.display_name}</strong></span>
                  )}
                  {c.brand_voice && (
                    <span>• Voice: {c.brand_voice}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleGeneratePostNow(c.id)}
                  disabled={generatingId === c.id}
                  className="btn btn-ghost border border-border text-xs !py-2 !px-3.5 flex items-center gap-1.5 text-brand hover:border-brand"
                  title="Generate a fresh AI post for this campaign right now"
                >
                  <Sparkles size={14} className={generatingId === c.id ? "animate-spin" : ""} />
                  {generatingId === c.id ? "Generating..." : "Generate Post Now"}
                </button>

                <button
                  onClick={() => handleToggleStatus(c.id, c.status)}
                  className="btn btn-ghost border border-border text-xs !p-2"
                  title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                >
                  {c.status === "active" ? <Pause size={14} /> : <Play size={14} />}
                </button>

                <button
                  onClick={() => handleDelete(c.id, c.name)}
                  className="btn btn-ghost border border-border text-xs !p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                  title="Delete Campaign"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
