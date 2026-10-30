"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Pause,
  Play,
  Mail,
  Sparkles,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  Eye,
  MousePointer,
  ChevronRight,
  Layers,
  Send,
  Clock,
  ShieldCheck,
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
    opened?: number;
    clicked?: number;
    replyRate: string;
    bounceRate: string;
    openRate?: string;
    clickRate?: string;
  };
  senderAccounts: any[];
  recipients: any[];
  steps?: any[];
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
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  // Recipient table filters
  const [recipientFilter, setRecipientFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
    // Poll every 10 seconds if campaign is actively running
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

  const handleRetryFailed = async () => {
    setRetryLoading(true);
    setRetryNotice(null);
    try {
      const res = await fetch(`/api/v1/outreach/campaigns/${campaignId}/retry`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setRetryNotice(json.message || "Failed leads successfully re-queued.");
        await fetchCampaign();
      } else {
        setRetryNotice(json.error || "Failed to retry leads.");
      }
    } catch {
      setRetryNotice("Network error trying to re-queue leads.");
    } finally {
      setRetryLoading(false);
    }
  };

  const { campaign, stats, senderAccounts, recipients, steps = [] } = data;
  const isRunning = campaign.status === "running";
  const isPaused = campaign.status === "paused";
  const isDraft = campaign.status === "draft";
  const isCompleted = campaign.status === "completed";

  // Filter recipients
  const filteredRecipients = recipients.filter((r) => {
    if (recipientFilter !== "all" && r.status !== recipientFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = (r.email || "").toLowerCase().includes(q);
      const matchName = (r.name || "").toLowerCase().includes(q);
      const matchCompany = (r.company || "").toLowerCase().includes(q);
      return matchEmail || matchName || matchCompany;
    }
    return true;
  });

  const progressPct =
    stats.total > 0 ? Math.min(100, Math.round((stats.sent / stats.total) * 100)) : 0;

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
              variant={
                isRunning
                  ? "success"
                  : isPaused
                  ? "warning"
                  : isCompleted
                  ? "accent"
                  : "neutral"
              }
              size="sm"
              className="uppercase font-mono text-[10px]"
            >
              {campaign.status}
            </Badge>
            <Badge variant="neutral" size="sm" className="font-mono text-[10px] uppercase">
              {campaign.mode === "ai" ? "AI Powered" : "Template"}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {stats.failed > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRetryFailed}
              disabled={retryLoading}
              icon={<RefreshCw size={13} className={retryLoading ? "animate-spin" : ""} />}
            >
              Retry Failed Leads ({stats.failed})
            </Button>
          )}

          <Link href={`/app/followup/${campaign.id}`}>
            <Button variant="secondary" size="sm" icon={<Layers size={13} />}>
              Follow-up Sequence ({steps.length})
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

      {retryNotice && (
        <div className="p-3 text-xs rounded-lg border border-primary/20 bg-primary/10 text-fg flex items-center justify-between">
          <span>{retryNotice}</span>
          <button onClick={() => setRetryNotice(null)} className="text-muted hover:text-fg font-bold">
            ×
          </button>
        </div>
      )}

      {/* Analytics Tile Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Total Leads</span>
          <div className="text-2xl font-bold text-fg mt-1">{stats.total}</div>
          <span className="text-[10px] text-muted">{stats.queued} Queued</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Dispatched</span>
          <div className="text-2xl font-bold text-fg mt-1">{stats.sent}</div>
          <span className="text-[10px] text-primary font-medium">{progressPct}% Complete</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Replies</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.replied}
          </div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {stats.replyRate}% Reply Rate
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Bounces</span>
          <div className="text-2xl font-bold text-danger mt-1">{stats.bounced}</div>
          <span className="text-[10px] text-muted">{stats.bounceRate}% Bounce</span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Unique Opens</span>
          <div className="text-2xl font-bold text-fg mt-1">{stats.opened || 0}</div>
          <span className="text-[10px] text-muted">
            {stats.openRate ? `${stats.openRate}% Rate` : "Pixel off"}
          </span>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="text-[10px] uppercase text-muted font-bold block">Unsubscribed</span>
          <div className="text-2xl font-bold text-muted mt-1">{stats.unsubscribed}</div>
          <span className="text-[10px] text-muted">Auto-Suppressed</span>
        </div>
      </div>

      {/* Funnel Progress Visualizer */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
            <Layers size={15} className="text-primary" /> Multi-Step Campaign Funnel
          </h2>
          <span className="text-xs text-muted">
            Timezone: <strong className="text-fg">{campaign.timezone || "UTC"}</strong> &bull; Jitter:{" "}
            {campaign.jitter_min_sec || 60}s - {campaign.jitter_max_sec || 180}s
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
          {/* Step 0 */}
          <div className="p-3.5 rounded-lg border border-border bg-bgSubtle space-y-1">
            <span className="text-[10px] font-bold uppercase text-muted">Step 0 &bull; Initial Outreach</span>
            <div className="text-lg font-bold text-fg">
              {stats.sent} <span className="text-xs font-normal text-muted">/ {stats.total}</span>
            </div>
            <p className="text-[11px] text-muted truncate">
              {campaign.subject_template || "AI Personalized subject"}
            </p>
          </div>

          {/* Follow-up Steps */}
          {steps.map((st: any, idx: number) => {
            const stepRecipients = recipients.filter((r) => r.current_step > st.step_no).length;
            return (
              <div key={st.id || idx} className="p-3.5 rounded-lg border border-border bg-bgSubtle space-y-1">
                <span className="text-[10px] font-bold uppercase text-muted">
                  Step {st.step_no} &bull; +{st.delay_days} Days
                </span>
                <div className="text-lg font-bold text-fg">
                  {stepRecipients} <span className="text-xs font-normal text-muted">delivered</span>
                </div>
                <p className="text-[11px] text-muted truncate">
                  {st.subject_template || "Threaded reply"}
                </p>
              </div>
            );
          })}

          {/* Outcomes */}
          <div className="p-3.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
              Stop-on-Reply Outcome
            </span>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {stats.replied} <span className="text-xs font-normal text-muted">responses</span>
            </div>
            <p className="text-[11px] text-muted">Follow-ups stopped automatically</p>
          </div>
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
            <div key={acc.id} className="rounded-lg border border-border bg-bgSubtle p-3.5 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-xs text-fg truncate max-w-[180px]">{acc.label}</div>
                  <div className="text-[11px] text-muted font-mono">{acc.from_email}</div>
                </div>
                <Badge variant={acc.status === "active" ? "success" : "warning"} size="sm">
                  {acc.status}
                </Badge>
              </div>
              <div className="border-t border-border pt-2 flex items-center justify-between text-[11px] text-muted">
                <span>Speed Cap:</span>
                <strong className="text-fg">{Math.min(acc.hourly_limit || 25, 25)}/hr</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recipient Logs Table */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Recipient Activity Logs ({filteredRecipients.length})
            </h2>
            <p className="text-xs text-muted">Real-time delivery status, thread IDs, opens, and responses.</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-bgSubtle text-fg placeholder:text-muted focus:outline-hidden focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-bgSubtle border border-border rounded-lg text-xs overflow-x-auto">
          {["all", "queued", "sent", "replied", "bounced", "failed", "unsubscribed"].map((tab) => (
            <button
              key={tab}
              onClick={() => setRecipientFilter(tab)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                recipientFilter === tab ? "bg-surface text-fg shadow-xs" : "text-muted hover:text-fg"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {filteredRecipients.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted border border-dashed border-border rounded-lg">
            No recipients matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgSubtle border-b border-border text-muted font-medium">
                <tr>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Step</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Opens / Clicks</th>
                  <th className="py-2.5 px-3">Dispatched At</th>
                  <th className="py-2.5 px-3">Notes / Error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecipients.map((r: any) => {
                  const getBadgeVariant = (status: string): "success" | "warning" | "danger" | "neutral" => {
                    if (status === "replied") return "success";
                    if (status === "sent") return "success";
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
                      <td className="py-2.5 px-3 text-muted font-mono">
                        {r.current_step === 0 ? "Initial" : `Step ${r.current_step}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge variant={getBadgeVariant(r.status)} size="sm" className="uppercase text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-muted">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1" title="Opens">
                            <Eye size={12} className={r.open_count > 0 ? "text-primary" : "text-muted"} />
                            {r.open_count || 0}
                          </span>
                          <span className="flex items-center gap-1" title="Clicks">
                            <MousePointer size={12} className={r.click_count > 0 ? "text-primary" : "text-muted"} />
                            {r.click_count || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-muted">
                        {r.sent_at ? new Date(r.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-muted max-w-[200px] truncate">
                        {r.error || (r.replied_at ? "Replied to outreach thread" : "—")}
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
