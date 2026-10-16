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
              className="rounded-xl border border-border bg-surface p-5 flex flex-col justify-between hover:border-borderStrong transition-all duration-150"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-fg">{p.name}</span>
                  {isConnected ? (
                    <Badge variant="success" size="sm" className="flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      <span>{connectedAccs.length} Connected</span>
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm">
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
                  variant="secondary"
                  size="sm"
                  onClick={() => openConnectModal(p.id)}
                  icon={<Link2 size={13} />}
                >
                  {isConnected ? "Add Account" : "Connect"}
                </Button>

                <Link href={p.href}>
                  <Button variant="ghost" size="sm" className="text-xs">
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
                    Authorize AutoHub to publish automated posts and AI media.
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
                className="w-full h-9 rounded-lg text-xs font-medium bg-primary text-primaryText flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
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
                  placeholder="e.g. AutoHub Studio"
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
