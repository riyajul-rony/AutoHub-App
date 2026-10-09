"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Send,
  Clock,
  Filter,
  RefreshCw,
  Image as ImageIcon
} from "lucide-react";

interface PostRun {
  id: string;
  campaign_id: string;
  status: "scheduled" | "pending_approval" | "published" | "failed" | "rejected";
  caption?: string;
  hashtags?: string[];
  external_url?: string;
  external_post_id?: string;
  error_message?: string;
  created_at: string;
  approved_at?: string;
  campaign?: {
    name: string;
    social_account?: {
      provider: string;
      display_name: string;
    };
  };
}

export function PostHistoryManager() {
  const [posts, setPosts] = useState<PostRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/v1/social/posts");
      const data = await res.json();
      if (data.data) {
        setPosts(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleApproveAndPost = async (id: string) => {
    setPublishingId(id);
    setNotification(null);
    try {
      const res = await fetch(`/api/v1/social/posts/${id}/publish`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setNotification({ type: "error", text: data.error || "Failed to publish post" });
        return;
      }
      setNotification({ type: "success", text: data.message || "Post successfully published!" });
      await fetchPosts();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to publish post" });
    } finally {
      setPublishingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm("Are you sure you want to reject this post draft?")) return;
    try {
      const res = await fetch(`/api/v1/social/posts/${id}/reject`, { method: "POST" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setNotification({ type: "success", text: "Post draft removed." });
      }
    } catch {
      alert("Failed to reject post");
    }
  };

  const handleGenerateSamplePost = async () => {
    setGenerating(true);
    setNotification(null);
    try {
      const res = await fetch("/api/v1/social/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.data) {
        setNotification({ type: "success", text: "New AI post draft generated and added to the review queue!" });
        await fetchPosts();
      }
    } catch {
      setNotification({ type: "error", text: "Failed to generate test post" });
    } finally {
      setGenerating(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (filterStatus === "all") return true;
    return p.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass p-4 rounded-3xl border border-border">
        {/* Status Filter Badges */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Posts" },
            { id: "pending_approval", label: "Pending Approval" },
            { id: "published", label: "Published" },
            { id: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === tab.id
                  ? "bg-brand text-white shadow-md shadow-brand/20"
                  : "bg-surface-2 text-muted hover:text-white hover:bg-surface-2/80"
              }`}
            >
              {tab.label} (
              {tab.id === "all"
                ? posts.length
                : posts.filter((p) => p.status === tab.id).length}
              )
            </button>
          ))}
        </div>

        {/* Generate Now Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={fetchPosts}
            className="btn btn-ghost !p-2 text-xs border border-border"
            title="Refresh List"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={handleGenerateSamplePost}
            disabled={generating}
            className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-brand/20 font-bold !py-2 !px-4"
          >
            <Sparkles size={14} className={generating ? "animate-spin" : ""} />
            {generating ? "Crafting AI Post..." : "Generate AI Post Now"}
          </button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.text}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="text-muted hover:text-white text-xs underline ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="glass rounded-3xl p-12 text-center text-xs text-muted">
          Loading social post runs...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center space-y-4 border border-border">
          <Clock size={32} className="mx-auto text-muted/40" />
          <div>
            <h3 className="text-base font-bold text-white">No Posts in this Queue</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 leading-relaxed">
              When your campaigns run or when you click &quot;Generate AI Post Now&quot;, drafts will appear here for review and one-click publishing.
            </p>
          </div>
          <button
            onClick={handleGenerateSamplePost}
            disabled={generating}
            className="btn btn-primary text-xs inline-flex items-center gap-2"
          >
            <Sparkles size={14} /> Generate First Test Post
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((p) => {
            const providerName = (
              p.campaign?.social_account?.provider || "Facebook"
            ).toUpperCase();

            return (
              <div
                key={p.id}
                className="glass rounded-3xl p-6 border border-border flex flex-col md:flex-row items-start justify-between gap-6 hover:border-brand/30 transition duration-150"
              >
                {/* Left Side: Details & Preview */}
                <div className="flex flex-col sm:flex-row items-start gap-5 flex-1 min-w-0">
                  {p.external_url && (
                    <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-border bg-surface-2 relative group">
                      <img
                        src={p.external_url}
                        alt="Post Visual"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge font-bold text-[10px] tracking-wide">
                        {providerName}
                      </span>

                      {p.status === "published" ? (
                        <span className="badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10 flex items-center gap-1 text-xs">
                          <CheckCircle2 size={12} /> Published
                        </span>
                      ) : p.status === "failed" ? (
                        <span className="badge border-rose-500/40 text-rose-400 bg-rose-500/10 flex items-center gap-1 text-xs">
                          <AlertCircle size={12} /> Failed
                        </span>
                      ) : (
                        <span className="badge border-amber-500/40 text-amber-400 bg-amber-500/10 flex items-center gap-1 text-xs">
                          <Clock size={12} /> Pending Approval
                        </span>
                      )}

                      <span className="text-[11px] text-muted">
                        {new Date(p.created_at).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {p.campaign?.name && (
                        <span className="text-[11px] text-muted">
                          • Campaign: <strong>{p.campaign.name}</strong>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-fg leading-relaxed whitespace-pre-line font-sans">
                      {p.caption || "No caption provided"}
                    </p>

                    {p.hashtags && p.hashtags.length > 0 && (
                      <p className="text-brand-2 text-xs font-medium">
                        {p.hashtags.join(" ")}
                      </p>
                    )}

                    {p.error_message && (
                      <p className="text-rose-400 text-xs">
                        Error: {p.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Action Controls */}
                <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
                  {p.status === "pending_approval" || p.status === "failed" ? (
                    <>
                      <button
                        onClick={() => handleReject(p.id)}
                        className="btn btn-ghost border border-border text-xs !p-2 text-muted hover:text-rose-300"
                        title="Reject / Delete Draft"
                      >
                        <Trash2 size={15} />
                      </button>

                      <button
                        onClick={() => handleApproveAndPost(p.id)}
                        disabled={publishingId === p.id}
                        className="btn btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-brand/20 font-bold !py-2 !px-4"
                      >
                        <Send size={13} className={publishingId === p.id ? "animate-pulse" : ""} />
                        {publishingId === p.id ? "Publishing Now..." : "Approve & Post"}
                      </button>
                    </>
                  ) : p.status === "published" ? (
                    <div className="flex items-center gap-2">
                      {p.external_url && (
                        <a
                          href={p.external_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost border border-border text-xs flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300"
                        >
                          <ExternalLink size={13} /> View Live Post
                        </a>
                      )}
                      <button
                        onClick={() => handleReject(p.id)}
                        className="btn btn-ghost border border-border text-xs !p-2 text-muted hover:text-rose-300"
                        title="Remove from history"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
