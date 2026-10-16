"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  Send,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
        body: JSON.stringify({ action: "generate_mock_post" }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate mock post");
      }
      setNotification({ type: "success", text: "New AI post draft generated and queued for approval!" });
      await fetchPosts();
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Generation failed" });
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
      {/* Top Filter and Actions Bar */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "All Posts" },
            { id: "pending_approval", label: "Pending Approval" },
            { id: "published", label: "Published" },
            { id: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filterStatus === tab.id
                  ? "bg-primary text-primaryText shadow-sm"
                  : "bg-bgSubtle text-muted hover:text-fg hover:bg-surfaceHover border border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPosts}
            title="Refresh list"
            icon={<RefreshCw size={13} className={loading ? "animate-spin" : ""} />}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateSamplePost}
            disabled={generating}
            icon={<Sparkles size={13} className={generating ? "animate-spin" : ""} />}
          >
            {generating ? "Crafting AI Post..." : "Generate AI Post Now"}
          </Button>
        </div>
      </div>

      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between animate-in fade-in duration-200 ${
            notification.type === "success"
              ? "bg-successBg border-success/30 text-success"
              : "bg-dangerBg border-danger/30 text-danger"
          }`}
        >
          <span className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {notification.text}
          </span>
          <button
            onClick={() => setNotification(null)}
            className="hover:underline text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Posts List */}
      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center text-xs text-muted">
          Loading social post runs...
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center space-y-3">
          <Clock size={28} className="mx-auto text-muted" />
          <div>
            <h3 className="text-sm font-semibold text-fg">No Posts in this Queue</h3>
            <p className="text-xs text-muted max-w-sm mx-auto mt-1 leading-relaxed">
              When your campaigns run or when you click &quot;Generate AI Post Now&quot;, drafts will appear here for review and one-click publishing.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleGenerateSamplePost}
            disabled={generating}
            icon={<Sparkles size={13} />}
          >
            Generate First Test Post
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredPosts.map((p) => {
            const providerName = (
              p.campaign?.social_account?.provider || "Facebook"
            ).toUpperCase();

            return (
              <div
                key={p.id}
                className="rounded-xl border border-border bg-surface p-5 flex flex-col md:flex-row items-start justify-between gap-5 hover:border-borderStrong transition-colors duration-150"
              >
                {/* Left Side: Details & Preview */}
                <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                  {p.external_url && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-border bg-bgSubtle relative">
                      <img
                        src={p.external_url}
                        alt="Post Visual"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                        {providerName}
                      </Badge>

                      {p.status === "published" ? (
                        <Badge variant="success" size="sm" className="flex items-center gap-1">
                          <CheckCircle2 size={11} /> Published
                        </Badge>
                      ) : p.status === "failed" ? (
                        <Badge variant="danger" size="sm" className="flex items-center gap-1">
                          <AlertCircle size={11} /> Failed
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm" className="flex items-center gap-1">
                          <Clock size={11} /> Pending Approval
                        </Badge>
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
                          • Campaign: <strong className="text-fg">{p.campaign.name}</strong>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-fg leading-relaxed whitespace-pre-line font-sans">
                      {p.caption || "No caption provided"}
                    </p>

                    {p.hashtags && p.hashtags.length > 0 && (
                      <p className="text-xs text-muted font-medium">
                        {p.hashtags.join(" ")}
                      </p>
                    )}

                    {p.error_message && (
                      <p className="text-danger text-xs font-mono">
                        Error: {p.error_message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: Action Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  {p.status === "pending_approval" || p.status === "failed" ? (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReject(p.id)}
                        title="Reject / Delete Draft"
                        icon={<Trash2 size={13} />}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveAndPost(p.id)}
                        disabled={publishingId === p.id}
                        icon={<Send size={13} className={publishingId === p.id ? "animate-pulse" : ""} />}
                      >
                        {publishingId === p.id ? "Publishing..." : p.status === "failed" ? "Retry Publish" : "Approve & Post"}
                      </Button>
                    </>
                  ) : p.status === "published" ? (
                    <div className="flex items-center gap-2">
                      {p.external_url && (
                        <a
                          href={p.external_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button variant="secondary" size="sm" icon={<ExternalLink size={12} />}>
                            View Live Post
                          </Button>
                        </a>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleReject(p.id)}
                        title="Remove from history"
                        icon={<Trash2 size={13} />}
                      />
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
