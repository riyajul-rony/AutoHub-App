"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Pause,
  Play,
  Trash2,
  Sparkles,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
    <div className="space-y-4">
      {statusNotice && (
        <div className="p-3.5 rounded-lg bg-successBg border border-success/30 text-xs text-success flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            {statusNotice}
          </span>
          <Link href="/app/social/history" className="font-medium underline ml-2">
            View Approval Queue →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted">
          Loading {platformName} campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-bgSubtle border border-border text-fg flex items-center justify-center mx-auto">
            <Sparkles size={22} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-fg">No {platformName} Campaigns Found</h3>
            <p className="text-xs text-muted max-w-md mx-auto mt-1 leading-relaxed">
              Create your first automated {platformName} campaign to generate and publish AI captions, hashtags, and branded visuals according to your schedule.
            </p>
          </div>
          <Link href={`/app/social/${provider}/new`}>
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              Create First {platformName} Campaign
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-surface p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 hover:border-borderStrong transition-colors duration-150"
            >
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-fg">{c.name}</span>
                  {c.status === "active" ? (
                    <Badge variant="success" size="sm" className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      Paused
                    </Badge>
                  )}
                  <Badge variant="neutral" size="sm">
                    {c.approval_mode === "auto" ? "Hands-Free Auto Post" : "Manual Approval"}
                  </Badge>
                </div>

                <div className="text-xs text-muted flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock size={12} className="text-subtle" />
                    Posts daily at {c.post_times?.join(", ") || "10:00"}
                  </span>
                  {c.social_account && (
                    <span>• Target: <strong className="text-fg">{c.social_account.display_name}</strong></span>
                  )}
                  {c.brand_voice && (
                    <span>• Voice: {c.brand_voice}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleGeneratePostNow(c.id)}
                  disabled={generatingId === c.id}
                  icon={<Sparkles size={13} className={generatingId === c.id ? "animate-spin" : ""} />}
                >
                  {generatingId === c.id ? "Generating..." : "Generate Post"}
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleToggleStatus(c.id, c.status)}
                  title={c.status === "active" ? "Pause Campaign" : "Resume Campaign"}
                  icon={c.status === "active" ? <Pause size={13} /> : <Play size={13} />}
                />

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDelete(c.id, c.name)}
                  title="Delete Campaign"
                  icon={<Trash2 size={13} />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
