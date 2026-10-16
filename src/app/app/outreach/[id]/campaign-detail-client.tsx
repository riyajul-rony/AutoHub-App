"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pause,
  Play,
  Mail,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CampaignDetail {
  campaign: any;
  stats: {
    total: number;
    queued: number;
    sent: number;
    replied: number;
    bounced: number;
    unsubscribed: number;
    failed: number;
    replyRate: string;
    bounceRate: string;
  };
  senderAccounts: any[];
  recipients: any[];
}

export function CampaignDetailClient({
  campaignId,
  initialData,
}: {
  campaignId: string;
  initialData: CampaignDetail;
}) {
  const [data, setData] = useState<CampaignDetail>(initialData);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/v1/outreach/campaigns/${campaignId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setData(json.data);
      }
    } catch {
      // keep existing data
    }
  };

  useEffect(() => {
    // Poll every 10 seconds if running
    if (data.campaign?.status === "running") {
      const interval = setInterval(() => {
        fetchCampaign();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [campaignId, data.campaign?.status]);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/outreach/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchCampaign();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const { campaign, stats, senderAccounts, recipients } = data;
  const isRunning = campaign.status === "running";
  const isPaused = campaign.status === "paused";
  const isDraft = campaign.status === "draft";

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted mb-2">
            <Link href="/app/outreach" className="hover:text-fg transition-colors flex items-center gap-1">
              <ArrowLeft size={13} /> All Campaigns
            </Link>
            <span>/</span>
            <span className="text-fg font-medium">{campaign.name}</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-fg">{campaign.name}</h1>
            <Badge
              variant={isRunning ? "success" : isPaused ? "warning" : "neutral"}
              size="sm"
              className="uppercase font-mono text-[10px]"
            >
              {campaign.status}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link href={`/app/followup/${campaign.id}`}>
            <Button variant="secondary" size="sm" icon={<Sparkles size={13} />}>
              Followup Sequence
            </Button>
          </Link>

          {isRunning && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleStatusChange("paused")}
              disabled={actionLoading}
              icon={<Pause size={13} />}
            >
              Pause Campaign
            </Button>
          )}

          {(isPaused || isDraft) && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStatusChange("running")}
              disabled={actionLoading}
              icon={<Play size={13} />}
            >
              {isDraft ? "Launch Campaign" : "Resume Campaign"}
            </Button>
          )}
        </div>
      </div>

      {/* Analytics Tile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Total Leads</span>
          <div className="text-2xl font-bold text-fg mt-1">{stats.total}</div>
          <span className="text-[10px] text-muted">In Campaign</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Sent / Dispatched</span>
          <div className="text-2xl font-bold text-success mt-1">{stats.sent}</div>
          <span className="text-[10px] text-muted">{stats.queued} Queued</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Replies</span>
          <div className="text-2xl font-bold text-fg mt-1">{stats.replied}</div>
          <span className="text-[10px] text-success font-semibold">{stats.replyRate}% Rate</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Bounces</span>
          <div className="text-2xl font-bold text-danger mt-1">{stats.bounced}</div>
          <span className="text-[10px] text-muted">{stats.bounceRate}% Bounce</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Unsubscribed</span>
          <div className="text-2xl font-bold text-muted mt-1">{stats.unsubscribed}</div>
          <span className="text-[10px] text-muted">Suppressed</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Mode</span>
          <div className="text-base font-bold text-fg mt-2 truncate">
            {campaign.mode === "ai" ? "AI Dynamic" : "Template"}
          </div>
          <span className="text-[10px] text-muted">{campaign.timezone}</span>
        </div>
      </div>

      {/* Rotating Inboxes Details */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
              <Mail size={15} className="text-muted" /> Sender Inboxes Rotating ({senderAccounts.length})
            </h2>
            <p className="text-xs text-muted">
              Traffic is automatically round-robined with a strict hard cap of 25 emails / hour per inbox.
            </p>
          </div>
          <Link href="/app/outreach/email-accounts">
            <Button variant="ghost" size="sm">
              Manage Inboxes
            </Button>
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {senderAccounts.map((acc: any) => (
            <div
              key={acc.id}
              className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-fg truncate max-w-[180px]">{acc.label}</div>
                  <div className="text-[11px] text-muted font-mono">{acc.from_email}</div>
                </div>
                <Badge variant="success" size="sm">
                  {acc.status}
                </Badge>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-[11px] text-muted">
                <span>Speed Cap:</span>
                <strong className="text-fg">{acc.hourly_limit || 25}/hr</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipient Logs Table */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Recipient Activity Logs ({recipients.length})
            </h2>
            <p className="text-xs text-muted">Real-time delivery status, thread IDs, and responses.</p>
          </div>
        </div>

        {recipients.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted border border-dashed border-border rounded-lg">
            No recipients recorded.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgSubtle border-b border-border text-muted font-medium">
                <tr>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Attempts</th>
                  <th className="py-2.5 px-3">Last Dispatched</th>
                  <th className="py-2.5 px-3">Error / Response</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recipients.map((r: any) => {
                  const getBadgeVariant = (status: string): "success" | "warning" | "danger" | "neutral" => {
                    if (status === "sent" || status === "replied") return "success";
                    if (status === "sending") return "warning";
                    if (status === "bounced" || status === "failed") return "danger";
                    return "neutral";
                  };

                  return (
                    <tr key={r.id} className="hover:bg-surfaceHover transition-colors">
                      <td className="py-2.5 px-3 font-medium text-fg">
                        <div>{r.email}</div>
                        {r.name && <div className="text-[11px] text-muted font-normal">{r.name}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-muted">{r.company || "—"}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={getBadgeVariant(r.status)} size="sm" className="uppercase text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted">{r.attempts}</td>
                      <td className="py-2.5 px-3 text-muted">
                        {r.sent_at ? new Date(r.sent_at).toLocaleTimeString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-muted max-w-[200px] truncate">
                        {r.error || (r.replied_at ? "Replied to thread" : "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
