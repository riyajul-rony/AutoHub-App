"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Link2,
  Unlink,
  AlertCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function FacebookIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-brand-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FD5949" />
          <stop offset="50%" stopColor="#D6249F" />
          <stop offset="100%" stopColor="#285AEB" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ig-brand-gradient)"
        d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      />
    </svg>
  );
}

function LinkedInIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#0A66C2">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

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
  defaultIdLabel: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "facebook",
    name: "Facebook",
    desc: "Auto post to Facebook Pages with custom AI graphics and automated captions.",
    href: "/app/social/facebook",
    defaultIdLabel: "Facebook Page ID",
  },
  {
    id: "instagram",
    name: "Instagram",
    desc: "Publish photos and carousel posts directly to connected Instagram Business accounts.",
    href: "/app/social/instagram",
    defaultIdLabel: "Instagram Business Account ID",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    desc: "Share professional thought-leadership articles and updates to personal profile or company page.",
    href: "/app/social/linkedin",
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
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

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

    // Check for OAuth callback query parameters
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const connected = params.get("connected");
      const count = params.get("count");
      const err = params.get("error");
      if (connected) {
        setSuccessBanner(`Successfully connected ${connected.toUpperCase()} (${count || 1} account${Number(count) > 1 ? "s" : ""})!`);
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (err) {
        setErrorBanner(err);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
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
    if (!modalProvider || !displayName || !externalId) return;

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
          access_token: accessToken || "mock_dev_token",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect account");
      }

      setModalProvider(null);
      setSuccessBanner(`Connected ${displayName} (${modalProvider.toUpperCase()}) successfully!`);
      loadAccounts();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to connect account");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect "${name}"?`)) return;

    try {
      const res = await fetch(`/api/v1/social/accounts/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to disconnect");
      setAccounts((prev) => prev.filter((a) => a.id !== id));
      setSuccessBanner(`Disconnected ${name}`);
    } catch (err: any) {
      setErrorBanner(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-lg bg-successBg border border-success/30 text-xs text-success flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="shrink-0" />
            <span className="font-medium">{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-success hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorBanner && (
        <div className="p-3.5 rounded-lg bg-dangerBg border border-danger/30 text-xs text-danger flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span className="font-medium">{errorBanner}</span>
          </div>
          <button
            onClick={() => setErrorBanner(null)}
            className="text-danger hover:underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Platform Cards */}
      <div className="grid gap-5 md:grid-cols-3">
        {PLATFORMS.map((p) => {
          const connectedAccs = accounts.filter((a) => a.provider === p.id);
          const isConnected = connectedAccs.length > 0;

          return (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-surface p-5 flex flex-col justify-between hover:border-borderStrong transition-colors duration-150"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-[7px] bg-bgSubtle border border-border flex items-center justify-center shrink-0">
                      {p.id === "facebook" && <FacebookIcon className="w-4 h-4" />}
                      {p.id === "instagram" && <InstagramIcon className="w-4 h-4" />}
                      {p.id === "linkedin" && <LinkedInIcon className="w-4 h-4" />}
                    </div>
                    <span className="font-semibold text-sm text-fg">{p.name}</span>
                  </div>
                  {isConnected ? (
                    <Badge variant="success" size="sm" dot={true}>
                      Connected ({connectedAccs.length})
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm" dot={true}>
                      Not Connected
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted leading-relaxed min-h-[36px]">{p.desc}</p>

                {/* Connected Accounts List */}
                {isConnected && (
                  <div className="space-y-1.5 pt-2">
                    {connectedAccs.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-bgSubtle border border-border text-xs"
                      >
                        <div className="truncate pr-2">
                          <span className="font-medium text-fg block truncate">{acc.display_name}</span>
                          <span className="text-[10px] text-muted font-mono">ID: {acc.external_id}</span>
                        </div>
                        <button
                          onClick={() => handleDisconnect(acc.id, acc.display_name)}
                          className="text-danger hover:bg-dangerBg p-1 rounded-md transition-colors"
                          title="Disconnect Account"
                        >
                          <Unlink size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openConnectModal(p.id)}
                  icon={<Link2 size={13} />}
                >
                  {isConnected ? "Add Account" : "Connect"}
                </Button>

                <Link href={p.href}>
                  <Button variant="secondary" size="sm" className="text-xs">
                    <span>Manage</span>
                    <span className="ml-1">→</span>
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Account Modal */}
      {modalProvider && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface w-full max-w-lg rounded-xl p-6 space-y-5 border border-border shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-bgSubtle border border-border text-fg flex items-center justify-center font-bold">
                  <Link2 size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-fg">
                    Connect {PLATFORMS.find((p) => p.id === modalProvider)?.name} Account
                  </h3>
                  <p className="text-xs text-muted">
                    Authorize Lead Reach AI to publish automated posts and AI media.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalProvider(null)}
                className="p-1 rounded-lg border border-border text-muted hover:text-fg hover:bg-bgSubtle transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-dangerBg border border-danger/30 text-xs text-danger flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Option A: Direct OAuth Connection */}
            <div className="space-y-3">
              <a
                href={`/api/v1/social/oauth/${modalProvider}?action=authorize`}
                className="w-full h-9 rounded-lg text-xs font-semibold bg-[var(--brand-emerald)] text-[var(--brand-emerald-fg)] flex items-center justify-center gap-2 hover:bg-[var(--brand-emerald-hover)] transition-colors"
              >
                <Link2 size={14} />
                <span>Connect via Official OAuth (1-Click)</span>
              </a>
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-3 text-[11px] text-muted">or connect manually with Page ID</span>
                <div className="flex-grow border-t border-border"></div>
              </div>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-fg block mb-1">
                  Account / Page Display Name *
                </label>
                <input
                  type="text"
                  className="input text-xs h-9 w-full"
                  required
                  placeholder="e.g. Lead Reach AI Studio"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-fg block mb-1">
                  {PLATFORMS.find((p) => p.id === modalProvider)?.defaultIdLabel} *
                </label>
                <input
                  type="text"
                  className="input text-xs font-mono h-9 w-full"
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
                <label className="text-xs font-medium text-fg flex items-center justify-between mb-1">
                  <span>Access Token (Optional in Dev)</span>
                  <span className="text-[10px] text-muted font-normal">Auto-mocked in dev</span>
                </label>
                <input
                  type="password"
                  className="input text-xs font-mono h-9 w-full"
                  placeholder="e.g. EAAB..."
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setModalProvider(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={submitting}
                >
                  {submitting ? "Connecting..." : "Save & Connect"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
