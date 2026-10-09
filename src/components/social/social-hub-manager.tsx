"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, CheckCircle2, Link2, Unlink, Sparkles, AlertCircle, X, ExternalLink } from "lucide-react";

interface SocialAccount {
  id: string;
  provider: "facebook" | "instagram" | "linkedin";
  external_id: string;
  display_name: string;
  picture_url?: string;
  status: string;
}

interface PlatformConfig {
  id: "facebook" | "instagram" | "linkedin";
  name: string;
  desc: string;
  href: string;
  color: string;
  defaultIdLabel: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    desc: "Auto post to Facebook Pages with custom AI graphics and automated captions",
    href: "/app/social/facebook",
    color: "from-blue-600 to-indigo-600",
    defaultIdLabel: "Facebook Page ID",
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Publish photos and carousel posts directly to connected Instagram Business accounts",
    href: "/app/social/instagram",
    color: "from-pink-600 to-purple-600",
    defaultIdLabel: "Instagram Business Account ID",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Share professional thought-leadership articles and updates to personal profile or company page",
    href: "/app/social/linkedin",
    color: "from-blue-500 to-cyan-600",
    defaultIdLabel: "LinkedIn Profile / Company URN",
  },
];

export function SocialHubManager() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalProvider, setModalProvider] = useState<"facebook" | "instagram" | "linkedin" | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadAccounts = async () => {
    try {
      const res = await fetch("/api/v1/social/accounts");
      const data = await res.json();
      if (data.data) {
        setAccounts(data.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const openConnectModal = (provider: "facebook" | "instagram" | "linkedin") => {
    setModalProvider(provider);
    setDisplayName("");
    setExternalId("");
    setAccessToken("");
    setErrorMessage("");
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalProvider) return;
    setSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/social/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: modalProvider,
          display_name: displayName,
          external_id: externalId,
          access_token: accessToken,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMessage(data.error || "Failed to connect account");
        return;
      }

      setModalProvider(null);
      await loadAccounts();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect ${name}?`)) return;
    try {
      const res = await fetch(`/api/v1/social/accounts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      alert("Failed to disconnect account");
    }
  };

  return (
    <div className="space-y-8">
      {/* Platform Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const connectedAccs = accounts.filter((a) => a.provider === p.id);
          const isConnected = connectedAccs.length > 0;

          return (
            <div
              key={p.id}
              className="glass rounded-3xl p-6 flex flex-col justify-between border border-border/80 hover:border-brand/40 transition-all duration-200"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full bg-gradient-to-tr ${p.color}`} />
                    <span className="font-bold text-lg text-white">{p.name}</span>
                  </div>
                  {isConnected ? (
                    <span className="badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10 flex items-center gap-1.5 px-2.5 py-1 text-xs">
                      <CheckCircle2 size={13} /> {connectedAccs.length} Connected
                    </span>
                  ) : (
                    <span className="badge border-border text-muted bg-surface-2/60 text-xs">
                      Not Connected
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted leading-relaxed min-h-[36px]">{p.desc}</p>

                {/* Connected Accounts List */}
                {isConnected && (
                  <div className="space-y-2 pt-2">
                    {connectedAccs.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2/80 border border-border/60 text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-semibold text-fg block truncate">{acc.display_name}</span>
                          <span className="text-[10px] text-muted font-mono">ID: {acc.external_id}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnect(acc.id, acc.display_name)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/10 transition"
                          title="Disconnect Account"
                        >
                          <Unlink size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between gap-2">
                <button
                  onClick={() => openConnectModal(p.id)}
                  className="btn btn-ghost text-xs !py-1.5 !px-3 flex items-center gap-1.5 text-brand-2 hover:bg-brand/10"
                >
                  <Link2 size={14} /> {isConnected ? "Add Another Page" : "Connect Account"}
                </button>

                <Link
                  href={p.href}
                  className="btn btn-ghost text-xs !py-1.5 !px-3 font-semibold hover:text-white"
                >
                  Manage Campaigns →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Account Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-lg rounded-3xl p-6 sm:p-8 space-y-6 border border-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-brand/20 text-brand flex items-center justify-center font-bold">
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">
                    Connect {PLATFORMS.find((p) => p.id === modalProvider)?.name} Account
                  </h3>
                  <p className="text-xs text-muted">
                    Authorize AutoHub to publish automated posts and AI media.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalProvider(null)}
                className="btn btn-ghost p-1.5 rounded-xl text-muted hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="label text-xs font-semibold">Account / Page Display Name *</label>
                <input
                  type="text"
                  className="input text-xs"
                  required
                  placeholder="e.g. AutoHub Real Estate"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold">
                  {PLATFORMS.find((p) => p.id === modalProvider)?.defaultIdLabel} *
                </label>
                <input
                  type="text"
                  className="input text-xs font-mono"
                  required
                  placeholder={
                    modalProvider === "facebook"
                      ? "e.g. 10293847561829"
                      : modalProvider === "instagram"
                      ? "e.g. 1784140530921"
                      : "e.g. urn:li:organization:123456"
                  }
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs font-semibold flex items-center justify-between">
                  <span>Access Token (Page / User Access Token)</span>
                  <span className="text-[11px] text-brand-2 font-normal">Optional in Dev</span>
                </label>
                <input
                  type="password"
                  className="input text-xs font-mono"
                  placeholder="e.g. EAAB..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
                <p className="text-[11px] text-muted mt-1 leading-relaxed">
                  For Facebook & Instagram: Enter your Meta Page Access Token. If left blank in local test mode, a verified development mock token is automatically provisioned!
                </p>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setModalProvider(null)}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary text-xs flex items-center gap-2 min-w-[140px] justify-center"
                >
                  {submitting ? "Connecting..." : "Save & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
