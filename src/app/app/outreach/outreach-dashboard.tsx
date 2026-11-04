"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Mail,
  Plus,
  Send,
  ChevronRight,
  Play,
  Pause,
  Search,
  CheckCircle2,
  AlertTriangle,
  UserX,
  TrendingUp,
  Inbox,
  Clock,
  MessageSquareReply,
  ShieldCheck,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/outreach/info-tooltip";
import { EmailAccountsManager, EmailAccount } from "./email-accounts/email-accounts-manager";

export interface CampaignSummary {
  id: string;
  name: string;
  mode: "ai" | "custom";
  status: "draft" | "running" | "paused" | "completed" | "cancelled";
  timezone?: string;
  totalRecipients: number;
  queuedCount: number;
  sentCount: number;
  repliesCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  failedCount: number;
  openedCount: number;
  created_at?: string;
  launched_at?: string;
}

export interface ReplySummary {
  id: string;
  subject: string;
  snippet: string;
  sent_at?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientCompany?: string;
  campaignId?: string;
  campaignName?: string;
}

interface OutreachDashboardProps {
  initialCampaigns: CampaignSummary[];
  initialAccounts?: EmailAccount[];
  initialReplies?: ReplySummary[];
  totalRepliesCount?: number;
}

export function OutreachDashboard({
  initialCampaigns,
  initialAccounts = [],
  initialReplies = [],
  totalRepliesCount = 0,
}: OutreachDashboardProps) {
  const searchParams = useSearchParams();
  const initialTabParam = searchParams.get("tab");
  const validTab =
    initialTabParam === "accounts" || initialTabParam === "replies"
      ? initialTabParam
      : "campaigns";

  const [activeTab, setActiveTab] = useState<"campaigns" | "accounts" | "replies">(validTab);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>(initialCampaigns);
  const [filterTab, setFilterTab] = useState<"all" | "running" | "paused" | "completed" | "draft">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Sync active tab with searchParams on browser back/forward or external link
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab === "accounts" || currentTab === "replies") {
      setActiveTab(currentTab);
    } else {
      setActiveTab("campaigns");
    }
  }, [searchParams]);

  // Tab change handler with URL sync
  const handleTabChange = (tab: "campaigns" | "accounts" | "replies") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (tab === "campaigns") {
        url.searchParams.delete("tab");
      } else {
        url.searchParams.set("tab", tab);
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Compute aggregate stats across all campaigns
  const totalCampaigns = campaigns.length;
  const totalSent = campaigns.reduce((acc, c) => acc + (c.sentCount || 0), 0);
  const totalReplies = campaigns.reduce((acc, c) => acc + (c.repliesCount || 0), 0);
  const totalBounces = campaigns.reduce((acc, c) => acc + (c.bouncedCount || 0), 0);
  const totalUnsubscribed = campaigns.reduce((acc, c) => acc + (c.unsubscribedCount || 0), 0);

  const avgReplyRate = totalSent > 0 ? ((totalReplies / totalSent) * 100).toFixed(1) : "0.0";
  const avgBounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : "0.0";

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    if (filterTab !== "all" && c.status !== filterTab) return false;
    if (searchQuery.trim()) {
      return c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  const handleStatusToggle = async (campaignId: string, currentStatus: string) => {
    const newStatus = currentStatus === "running" ? "paused" : "running";
    setActionLoadingId(campaignId);
    try {
      const res = await fetch(`/api/v1/outreach/campaigns/${campaignId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setCampaigns((prev) =>
          prev.map((c) => (c.id === campaignId ? { ...c, status: newStatus as any } : c))
        );
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1-Line Onboarding Guide Banner if No Email Accounts Connected */}
      {initialAccounts.length === 0 && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-900 dark:text-amber-200">
            <AlertTriangle size={16} className="text-amber-500 shrink-0" />
            <span>
              <strong>Connect your first email to get started</strong> — You need at least 1 sender inbox connected before cold campaigns can be dispatched.
            </span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleTabChange("accounts")}
            className="shrink-0 self-start sm:self-auto"
            icon={<Plus size={13} />}
          >
            Connect Email
          </Button>
        </div>
      )}

      {/* 3 Main Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-px" role="tablist">
        <button
          type="button"
          id="tab-btn-campaigns"
          role="tab"
          aria-selected={activeTab === "campaigns"}
          onClick={() => handleTabChange("campaigns")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "campaigns"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Send size={15} />
          <span>Campaigns</span>
          <span
            className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === "campaigns"
                ? "bg-primary/10 text-primary"
                : "bg-bgSubtle border border-border text-muted"
            }`}
          >
            {campaigns.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-btn-accounts"
          role="tab"
          aria-selected={activeTab === "accounts"}
          onClick={() => handleTabChange("accounts")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "accounts"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <Mail size={15} />
          <span>Email Accounts</span>
          <span
            className={`ml-1 text-[11px] px-2 py-0.5 rounded-full font-mono ${
              activeTab === "accounts"
                ? "bg-primary/10 text-primary"
                : "bg-bgSubtle border border-border text-muted"
            }`}
          >
            {initialAccounts.length}
          </span>
        </button>

        <button
          type="button"
          id="tab-btn-replies"
          role="tab"
          aria-selected={activeTab === "replies"}
          onClick={() => handleTabChange("replies")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px ${
            activeTab === "replies"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-muted hover:text-fg"
          }`}
        >
          <MessageSquareReply size={15} />
          <span>Inbox &amp; Replies</span>
          {totalRepliesCount > 0 && (
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
              {totalRepliesCount}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================== */}
      {/* TAB 1: CAMPAIGNS                                           */}
      {/* ========================================================== */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Aggregate KPI Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
            <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Campaigns</span>
                  <InfoTooltip
                    title="Active & Total Campaigns"
                    content="Total outreach campaigns in your workspace. You can pause or resume them at any time."
                  />
                </div>
                <Inbox size={15} />
              </div>
              <div className="text-2xl font-bold text-fg">{totalCampaigns}</div>
              <p className="text-[11px] text-muted">
                {campaigns.filter((c) => c.status === "running").length} currently running
              </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Dispatched</span>
                  <InfoTooltip
                    title="Emails Dispatched"
                    content="Total cold outreach emails successfully delivered through your connected sender inboxes."
                  />
                </div>
                <Send size={15} className="text-primary" />
              </div>
              <div className="text-2xl font-bold text-fg">{totalSent}</div>
              <p className="text-[11px] text-muted">Cold emails delivered</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Reply Rate</span>
                  <InfoTooltip
                    title="Genuine Prospect Replies"
                    content="Percentage of leads who replied to your emails. Lead Reach AI's IMAP stop-on-reply engine automatically halts follow-ups when someone responds."
                  />
                </div>
                <TrendingUp size={15} className="text-emerald-500" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {avgReplyRate}%
              </div>
              <p className="text-[11px] text-muted">{totalReplies} genuine prospect replies</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1">
              <div className="flex items-center justify-between text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Bounce Rate</span>
                  <InfoTooltip
                    title="Bounce Protection"
                    content="Emails sent to invalid or deleted addresses. Lead Reach AI suppresses them automatically so your sender reputation remains pristine."
                  />
                </div>
                <AlertTriangle
                  size={15}
                  className={Number(avgBounceRate) > 5 ? "text-danger" : "text-muted"}
                />
              </div>
              <div className="text-2xl font-bold text-fg">{avgBounceRate}%</div>
              <p className="text-[11px] text-muted">{totalBounces} bounces suppressed</p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 space-y-1 col-span-2 md:col-span-1">
              <div className="flex items-center justify-between text-muted">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Do-Not-Email</span>
                  <InfoTooltip
                    title="Do-Not-Email List (Suppression)"
                    content="Prospects who clicked unsubscribe or asked not to be contacted. Lead Reach AI strictly prevents any further emails from being sent to them."
                  />
                </div>
                <UserX size={15} />
              </div>
              <div className="text-2xl font-bold text-fg">{totalUnsubscribed}</div>
              <p className="text-[11px] text-muted">Auto-suppressed safely</p>
            </div>
          </div>

          {/* Campaigns Listing Container */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-bgSubtle border border-border rounded-lg text-xs overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "all"
                      ? "bg-surface text-fg shadow-xs font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  All ({campaigns.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("running")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "running"
                      ? "bg-surface text-fg shadow-xs font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Running ({campaigns.filter((c) => c.status === "running").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("paused")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "paused"
                      ? "bg-surface text-fg shadow-xs font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Paused ({campaigns.filter((c) => c.status === "paused").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("completed")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "completed"
                      ? "bg-surface text-fg shadow-xs font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Completed ({campaigns.filter((c) => c.status === "completed").length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("draft")}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    filterTab === "draft"
                      ? "bg-surface text-fg shadow-xs font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  Drafts ({campaigns.filter((c) => c.status === "draft").length})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative min-w-[220px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-bgSubtle text-fg placeholder:text-muted focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            {/* Campaign Cards List or Empty State */}
            {filteredCampaigns.length === 0 ? (
              searchQuery ? (
                <div className="py-12 text-center text-xs text-muted border border-dashed border-border rounded-lg space-y-2">
                  <Mail size={28} className="mx-auto text-muted/60" />
                  <div className="text-sm font-medium text-fg">No matching campaigns</div>
                  <p className="max-w-sm mx-auto text-muted">
                    No campaign matches &quot;{searchQuery}&quot;. Try adjusting your search query.
                  </p>
                </div>
              ) : (
                /* 3-Step Guided Empty State */
                <div className="rounded-[8px] border border-dashed border-border bg-bgSubtle/40 p-8 sm:p-12 text-center space-y-6">
                  <div className="w-12 h-12 mx-auto rounded-[10px] bg-[var(--brand-emerald-subtle)] border border-[var(--brand-emerald-border)] flex items-center justify-center text-[var(--badge-success-text)] shadow-xs">
                    <Mail size={22} />
                  </div>
                  <div className="max-w-md mx-auto space-y-1.5">
                    <h3 className="text-base sm:text-lg font-bold text-fg">
                      Create your first cold outreach campaign in 3 steps
                    </h3>
                    <p className="text-xs text-muted leading-relaxed">
                      Lead Reach AI safely dispatches emails with multi-inbox rotation, human-like random pacing, and automatic stop-on-reply protection.
                    </p>
                  </div>

                  {/* 3 Steps Flow */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                    <div className="p-3.5 rounded-[8px] border border-border bg-surface space-y-1 hover:border-borderStrong transition-colors">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--badge-success-text)]">
                        Step 1
                      </div>
                      <div className="text-xs font-semibold text-fg">Connect Email</div>
                      <div className="text-[11px] text-muted">
                        Connect your Gmail, Outlook, or business SMTP sender inbox
                      </div>
                    </div>
                    <div className="p-3.5 rounded-[8px] border border-border bg-surface space-y-1 hover:border-borderStrong transition-colors">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--badge-success-text)]">
                        Step 2
                      </div>
                      <div className="text-xs font-semibold text-fg">Import Leads</div>
                      <div className="text-[11px] text-muted">
                        Import from Lead Gen search results or paste custom lead list
                      </div>
                    </div>
                    <div className="p-3.5 rounded-[8px] border border-border bg-surface space-y-1 hover:border-borderStrong transition-colors">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--badge-success-text)]">
                        Step 3
                      </div>
                      <div className="text-xs font-semibold text-fg">Review &amp; Launch</div>
                      <div className="text-[11px] text-muted">
                        Pick safe sending speed presets and start dispatches
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link href="/app/outreach/new">
                      <Button variant="primary" size="md" icon={<Plus size={16} />}>
                        Create First Campaign
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div className="divide-y divide-border">
                {filteredCampaigns.map((c) => {
                  const progressPct =
                    c.totalRecipients > 0
                      ? Math.min(100, Math.round((c.sentCount / c.totalRecipients) * 100))
                      : 0;

                  const isRunning = c.status === "running";
                  const isPaused = c.status === "paused";
                  const isCompleted = c.status === "completed";

                  return (
                    <div
                      key={c.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-bgSubtle/40 -mx-2 px-3 rounded-[8px] transition-colors"
                    >
                      {/* Left Column: Title & Meta */}
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/app/outreach/${c.id}`}
                            className="font-semibold text-sm text-fg hover:text-primary transition-colors truncate max-w-md"
                          >
                            {c.name}
                          </Link>
                          <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-mono">
                            {c.mode === "ai" ? "AI Personalized" : "Template"}
                          </Badge>
                          
                          {/* Color-Coded Status Badge */}
                          {isRunning ? (
                            <Badge variant="success" size="sm" dot>
                              RUNNING
                            </Badge>
                          ) : isPaused ? (
                            <Badge variant="warning" size="sm" dot>
                              PAUSED
                            </Badge>
                          ) : isCompleted ? (
                            <Badge variant="success" size="sm" dot>
                              COMPLETED
                            </Badge>
                          ) : (
                            <Badge variant="neutral" size="sm" dot className="text-[10px] uppercase font-mono">
                              {c.status}
                            </Badge>
                          )}
                        </div>

                        {/* Progress Bar & Counts */}
                        <div className="space-y-1 max-w-md">
                          <div className="flex items-center justify-between text-[11px] text-muted">
                            <span>
                              Progress: <strong className="text-fg">{c.sentCount}</strong> /{" "}
                              {c.totalRecipients} sent
                            </span>
                            <span className="font-semibold text-fg">{progressPct}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--brand-emerald)] rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Metrics Row */}
                        <div className="flex items-center gap-3 text-[11px] text-muted flex-wrap">
                          <span className="flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <strong className="text-fg">{c.repliesCount}</strong> replies
                            {c.sentCount > 0 && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ({((c.repliesCount / c.sentCount) * 100).toFixed(1)}%)
                              </span>
                            )}
                          </span>
                          {c.bouncedCount > 0 && (
                            <span className="flex items-center gap-1 text-danger font-medium">
                              <AlertTriangle size={12} />
                              {c.bouncedCount} bounced
                            </span>
                          )}
                          {c.failedCount > 0 && (
                            <span className="text-amber-500 font-medium">
                              {c.failedCount} failed
                            </span>
                          )}
                          {c.timezone && (
                            <span className="flex items-center gap-1">
                              <Clock size={11} /> {c.timezone}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Column: Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(isRunning || isPaused) && (
                          <Button
                            variant={isRunning ? "secondary" : "primary"}
                            size="sm"
                            onClick={() => handleStatusToggle(c.id, c.status)}
                            disabled={actionLoadingId === c.id}
                            icon={
                              actionLoadingId === c.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : isRunning ? (
                                <Pause size={13} />
                              ) : (
                                <Play size={13} />
                              )
                            }
                          >
                            {isRunning ? "Pause" : "Resume"}
                          </Button>
                        )}

                        <Link href={`/app/followup/${c.id}`}>
                          <Button variant="ghost" size="sm">
                            Follow-up
                          </Button>
                        </Link>

                        <Link href={`/app/outreach/${c.id}`}>
                          <Button variant="secondary" size="sm" icon={<ChevronRight size={13} />}>
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 2: EMAIL ACCOUNTS                                      */}
      {/* ========================================================== */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <EmailAccountsManager initialAccounts={initialAccounts} />
        </div>
      )}

      {/* ========================================================== */}
      {/* TAB 3: INBOX & REPLIES                                     */}
      {/* ========================================================== */}
      {activeTab === "replies" && (
        <div className="space-y-4">
          {/* Status Header Bar */}
          <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h3 className="text-xs font-semibold text-fg flex items-center gap-2">
                  <span>Stop-On-Reply Active</span>
                  <Badge variant="success" size="sm">
                    IMAP Poller Running
                  </Badge>
                </h3>
                <p className="text-[11px] text-muted">
                  Lead Reach AI monitors your connected inboxes. When a prospect replies, scheduled followups are instantly halted.
                </p>
              </div>
            </div>

            <Link href="/app/replies">
              <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />}>
                Full Replies Inbox
              </Button>
            </Link>
          </div>

          {/* Incoming Messages List */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted pb-2 border-b border-border">
              <span>Recent Inbound Responses ({initialReplies.length})</span>
              <span>Sorted by latest received</span>
            </div>

            {initialReplies.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted space-y-2">
                <MessageSquareReply size={32} className="mx-auto text-muted/50" />
                <div className="text-sm font-medium text-fg">No replies detected yet</div>
                <p className="max-w-md mx-auto text-muted">
                  When prospects respond to your cold outreach emails, their replies will appear here automatically and stop all pending follow-up steps.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {initialReplies.map((reply) => (
                  <div
                    key={reply.id}
                    className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-bgSubtle/40 -mx-2 px-3 rounded-lg transition-colors"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-fg">
                          {reply.recipientName || reply.recipientEmail}
                        </span>
                        {reply.recipientCompany && (
                          <span className="text-[11px] text-muted">
                            at {reply.recipientCompany}
                          </span>
                        )}
                        <span className="text-[11px] text-muted font-mono">
                          &lt;{reply.recipientEmail}&gt;
                        </span>
                        {reply.campaignName && (
                          <Badge variant="neutral" size="sm" className="text-[10px]">
                            {reply.campaignName}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs font-medium text-fg truncate">
                        {reply.subject}
                      </div>

                      {reply.snippet && (
                        <p className="text-[11px] text-muted line-clamp-2">
                          {reply.snippet}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 text-[11px] text-muted">
                      {reply.sent_at ? new Date(reply.sent_at).toLocaleString() : "Recently"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
