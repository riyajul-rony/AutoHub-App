"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  Save,
  Sliders,
  DollarSign,
  Cloud,
  Layers,
  Plus,
  Trash2,
  PlayCircle,
  Check,
  X,
  RefreshCw,
  Activity,
  Server,
} from "lucide-react";
import type { ApifySettings } from "@/server/providers/leads/apify/types";
import type { ApifyConfigReason, ApifyLastTestResult } from "@/server/providers/leads/apify/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface ApifyKeyPoolItem {
  id: string;
  label: string;
  token_last4: string;
  masked_token: string;
  account_email?: string | null;
  plan_name?: string | null;
  status: "active" | "disabled" | "cooldown";
  max_concurrent_jobs: number;
  in_flight_jobs: number;
  cooldown_until?: string | null;
  last_error_reason?: string | null;
  last_used_at?: string | null;
  total_runs: number;
  total_cost_usd: number;
  created_at: string;
}

interface ApifyAdminFormProps {
  initialConfigured: boolean;
  initialReason?: ApifyConfigReason;
  initialLastTest?: ApifyLastTestResult | null;
  initialMaskedToken: string | null;
  initialSettings: ApifySettings;
  hasEncryptionKey: boolean;
}

export function ApifyAdminForm({
  initialConfigured,
  initialReason = "NO_TOKEN",
  initialLastTest = null,
  initialMaskedToken,
  initialSettings,
  hasEncryptionKey,
}: ApifyAdminFormProps) {
  // Key Pool state
  const [keys, setKeys] = useState<ApifyKeyPoolItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [newKeyToken, setNewKeyToken] = useState("");
  const [newKeyMaxJobs, setNewKeyMaxJobs] = useState(2);
  const [addingKey, setAddingKey] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [keyActionMsg, setKeyActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Legacy single token fallback state
  const [maskedToken, setMaskedToken] = useState<string | null>(initialMaskedToken);
  const [reason, setReason] = useState<ApifyConfigReason>(initialReason);
  const [lastTest, setLastTest] = useState<ApifyLastTestResult | null>(initialLastTest);
  const [newTokenInput, setNewTokenInput] = useState("");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Configuration state
  const [settings, setSettings] = useState<ApifySettings>(initialSettings);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Fetch Key Pool items
  const fetchKeys = useCallback(async () => {
    try {
      setKeysLoading(true);
      setKeysError(null);
      const res = await fetch("/api/v1/admin/apify/keys");
      const data = await res.json();
      if (res.ok && Array.isArray(data.data)) {
        setKeys(data.data);
      } else {
        setKeysError(data?.error || "Failed to load Apify key pool.");
      }
    } catch (err: any) {
      console.warn("Could not fetch Apify keys", err);
      setKeysError(err?.message || "Could not connect to the server.");
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  // Handle Add Key to Pool
  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyLabel.trim() || !newKeyToken.trim()) return;

    setAddingKey(true);
    setKeyActionMsg(null);

    try {
      const res = await fetch("/api/v1/admin/apify/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newKeyLabel.trim(),
          token: newKeyToken.trim(),
          max_concurrent_jobs: Number(newKeyMaxJobs) || 2,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add Apify key");
      }

      setKeyActionMsg({ type: "success", text: data.message || "Key added successfully." });
      setNewKeyLabel("");
      setNewKeyToken("");
      setNewKeyMaxJobs(2);
      setAddKeyOpen(false);
      fetchKeys();
    } catch (err: any) {
      setKeyActionMsg({ type: "error", text: err.message || "Failed to add key to pool" });
    } finally {
      setAddingKey(false);
    }
  };

  // Handle Test Single Key Connection
  const handleTestKey = async (keyId: string) => {
    setTestingKeyId(keyId);
    setKeyActionMsg(null);

    try {
      const res = await fetch(`/api/v1/admin/apify/keys/${keyId}/test`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Test connection failed");
      }

      if (data.data?.ok) {
        setKeyActionMsg({
          type: "success",
          text: `Key connection verified! Account: ${data.data.username || "Apify User"} (${data.data.plan || "Active"})`,
        });
      } else {
        setKeyActionMsg({
          type: "error",
          text: `Key test failed: ${data.data?.error || "Unknown error"}`,
        });
      }
      fetchKeys();
    } catch (err: any) {
      setKeyActionMsg({ type: "error", text: err.message || "Connection test failed" });
    } finally {
      setTestingKeyId(null);
    }
  };

  // Handle Toggle Key Status (active / disabled)
  const handleToggleKeyStatus = async (key: ApifyKeyPoolItem) => {
    setKeyActionMsg(null);
    const nextStatus = key.status === "active" ? "disabled" : "active";
    try {
      const res = await fetch(`/api/v1/admin/apify/keys/${key.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, clearCooldown: nextStatus === "active" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update key status");
      }
      fetchKeys();
    } catch (err: any) {
      setKeyActionMsg({ type: "error", text: err.message || "Failed to update key status" });
    }
  };

  // Handle Clear Key Cooldown
  const handleClearCooldown = async (keyId: string) => {
    setKeyActionMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/apify/keys/${keyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearCooldown: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reset cooldown");
      }
      setKeyActionMsg({ type: "success", text: "Key cooldown reset. Key is now active." });
      fetchKeys();
    } catch (err: any) {
      setKeyActionMsg({ type: "error", text: err.message || "Failed to reset cooldown" });
    }
  };

  // Handle Delete Key
  const handleDeleteKey = async (key: ApifyKeyPoolItem) => {
    if (!confirm(`Are you sure you want to delete key "${key.label}" from the pool?`)) return;
    setKeyActionMsg(null);
    try {
      const res = await fetch(`/api/v1/admin/apify/keys/${key.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete key");
      }
      setKeyActionMsg({ type: "success", text: `Key "${key.label}" deleted from pool.` });
      fetchKeys();
    } catch (err: any) {
      setKeyActionMsg({ type: "error", text: err.message || "Failed to delete key" });
    }
  };

  // Handle Legacy Master Token Save
  const handleSaveToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenInput.trim()) return;

    setTokenLoading(true);
    setTokenError(null);
    setTokenSuccess(null);

    try {
      const res = await fetch("/api/v1/admin/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: newTokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save Apify token");
      }

      setMaskedToken(data.data.maskedToken);
      setNewTokenInput("");
      setReason("OK");
      setTokenSuccess("Legacy fallback Apify API token saved and encrypted with AES-256-GCM successfully.");
    } catch (err: any) {
      setTokenError(err.message || "Failed to save token");
    } finally {
      setTokenLoading(false);
    }
  };

  // Handle Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsError(null);
    setSettingsSuccess(null);

    try {
      const res = await fetch("/api/v1/admin/apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save Apify settings");
      }

      setSettings(data.data.settings);
      setSettingsSuccess("Apify actors, limits, and cost estimates updated successfully.");
    } catch (err: any) {
      setSettingsError(err.message || "Failed to save settings");
    } finally {
      setSettingsLoading(false);
    }
  };

  const activeKeysCount = keys.filter((k) => k.status === "active").length;
  const inFlightCount = keys.reduce((acc, k) => acc + (k.in_flight_jobs || 0), 0);

  return (
    <div className="space-y-6">
      {/* Master Encryption Key Alert */}
      {!hasEncryptionKey && (
        <div className="rounded-xl border border-danger/40 bg-red-500/10 p-4 sm:p-5 flex items-start gap-3.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={20} className="shrink-0 mt-0.5 text-danger" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-fg">APP_ENCRYPTION_KEY Missing</h4>
            <p className="leading-relaxed">
              The master encryption key is not set in your environment variables. Token encryption and decryption will fail until a 32-byte base64 key is configured in your <code>.env</code> file (e.g. <code>APP_ENCRYPTION_KEY=&quot;...&quot;</code>).
            </p>
          </div>
        </div>
      )}

      {/* Card 1: Apify Key Pool & Multi-Token Load Balancing */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server size={18} className="text-brand" /> Apify API Key Pool &amp; Load Balancing
              </CardTitle>
              <CardDescription>
                Distribute scraping jobs across multiple Apify accounts. Provides automated least-busy routing, per-token concurrency limits, and automatic failover on 401/402/429/rental errors.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchKeys}
                disabled={keysLoading}
                className="h-8 text-xs"
              >
                <RefreshCw size={12} className={`mr-1.5 ${keysLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setAddKeyOpen(!addKeyOpen)}
                className="h-8 text-xs font-semibold"
              >
                <Plus size={14} className="mr-1.5" /> Add Apify Key
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          {/* Key Pool Status Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-bgSubtle border border-border text-xs">
            <div>
              <span className="text-muted text-[11px] block">Active Keys in Pool</span>
              <span className="text-base font-bold text-fg font-mono">
                {activeKeysCount} <span className="text-xs text-muted font-normal">/ {keys.length} total</span>
              </span>
            </div>
            <div>
              <span className="text-muted text-[11px] block">In-Flight Jobs (Redis)</span>
              <span className="text-base font-bold text-brand font-mono">{inFlightCount}</span>
            </div>
            <div>
              <span className="text-muted text-[11px] block">Total Scraper Runs</span>
              <span className="text-base font-bold text-fg font-mono">
                {keys.reduce((acc, k) => acc + (Number(k.total_runs) || 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-muted text-[11px] block">Estimated Lifetime Spend</span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                ${keys.reduce((acc, k) => acc + (Number(k.total_cost_usd) || 0), 0).toFixed(4)}
              </span>
            </div>
          </div>

          {/* Add Key Drawer / Inline Form */}
          {addKeyOpen && (
            <form onSubmit={handleAddKey} className="p-4 rounded-xl border border-brand/30 bg-surface space-y-3.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <h4 className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <Key size={14} className="text-brand" /> Add New Apify Token to Pool
                </h4>
                <button
                  type="button"
                  onClick={() => setAddKeyOpen(false)}
                  className="text-muted hover:text-fg text-xs"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-12 items-end">
                <div className="sm:col-span-4 space-y-1">
                  <label className="label text-xs font-medium">Key Label / Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Primary Account, Team Scale Token"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    className="input h-9 text-xs w-full"
                  />
                </div>
                <div className="sm:col-span-5 space-y-1">
                  <label className="label text-xs font-medium">Apify API Token (apify_api_...)</label>
                  <input
                    type="password"
                    required
                    placeholder="Paste personal API token"
                    value={newKeyToken}
                    onChange={(e) => setNewKeyToken(e.target.value)}
                    className="input h-9 text-xs font-mono w-full"
                  />
                </div>
                <div className="sm:col-span-3 space-y-1">
                  <label className="label text-xs font-medium">Max Parallel Jobs (1–10)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={newKeyMaxJobs}
                    onChange={(e) => setNewKeyMaxJobs(Math.max(1, parseInt(e.target.value, 10) || 2))}
                    className="input h-9 text-xs w-full font-mono"
                  />
                </div>
              </div>

              {keyActionMsg && (
                <div
                  className={`rounded-lg px-3.5 py-2.5 text-xs flex items-center justify-between border ${
                    keyActionMsg.type === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {keyActionMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{keyActionMsg.text}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted">
                  Token is verified against Apify <span className="font-mono">GET /v2/users/me</span> and encrypted with AES-256-GCM.
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddKeyOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={addingKey}
                    disabled={addingKey || !newKeyLabel.trim() || !newKeyToken.trim() || !hasEncryptionKey}
                    className="h-8 text-xs font-semibold"
                  >
                    Verify &amp; Add to Pool
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Feedback Message */}
          {keyActionMsg && (
            <div
              className={`rounded-lg px-3.5 py-2.5 text-xs flex items-center justify-between border ${
                keyActionMsg.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              }`}
            >
              <div className="flex items-center gap-2">
                {keyActionMsg.type === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                <span>{keyActionMsg.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setKeyActionMsg(null)}
                className="opacity-70 hover:opacity-100"
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Error Alert Card if Key Pool fetch failed */}
          {keysError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{keysError}</span>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={fetchKeys} className="h-7 text-xs border-red-500/40 hover:bg-red-500/20">
                Retry
              </Button>
            </div>
          )}

          {/* Keys Table */}
          {keys.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-bgSubtle border-b border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3.5">Label / Token</th>
                    <th className="py-2.5 px-3.5">Account &amp; Plan</th>
                    <th className="py-2.5 px-3.5">Status</th>
                    <th className="py-2.5 px-3.5">Active Concurrency</th>
                    <th className="py-2.5 px-3.5">Runs / Spend</th>
                    <th className="py-2.5 px-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {keys.map((k) => {
                    const isCooldown = k.status === "cooldown" && k.cooldown_until && new Date(k.cooldown_until) > new Date();

                    return (
                      <tr key={k.id} className="hover:bg-bgSubtle/50 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-fg">{k.label}</div>
                          <div className="font-mono text-[11px] text-muted">{k.masked_token}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="text-fg font-medium">{k.account_email || "Apify Account"}</div>
                          <div className="text-[11px] text-muted">{k.plan_name || "Active"}</div>
                        </td>

                        <td className="py-3 px-3.5">
                          {isCooldown ? (
                            <div className="space-y-1">
                              <span className="badge border-amber-500/40 text-amber-500 bg-amber-500/10 text-[10px] font-semibold px-2 py-0.5">
                                In Cooldown
                              </span>
                              {k.last_error_reason && (
                                <p className="text-[10px] text-muted truncate max-w-[180px]" title={k.last_error_reason}>
                                  {k.last_error_reason}
                                </p>
                              )}
                            </div>
                          ) : k.status === "active" ? (
                            <span className="badge border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold px-2 py-0.5">
                              Active
                            </span>
                          ) : (
                            <span className="badge border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10 text-[10px] font-semibold px-2 py-0.5">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className={k.in_flight_jobs > 0 ? "text-brand font-bold" : "text-fg"}>
                              {k.in_flight_jobs}
                            </span>
                            <span className="text-muted">/ {k.max_concurrent_jobs} max</span>
                          </div>
                          <div className="w-16 h-1 rounded-full bg-border overflow-hidden mt-1">
                            <div
                              className="h-full bg-brand transition-all"
                              style={{ width: `${Math.min(100, ((k.in_flight_jobs || 0) / k.max_concurrent_jobs) * 100)}%` }}
                            />
                          </div>
                        </td>

                        <td className="py-3 px-3.5">
                          <div className="font-mono text-fg">{Number(k.total_runs) || 0} runs</div>
                          <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                            ${(Number(k.total_cost_usd) || 0).toFixed(4)}
                          </div>
                        </td>

                        <td className="py-3 px-3.5 text-right space-x-1">
                          {isCooldown && (
                            <button
                              type="button"
                              onClick={() => handleClearCooldown(k.id)}
                              className="btn btn-ghost border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-[11px] !py-1 !px-2"
                              title="Clear cooldown and activate immediately"
                            >
                              Reset
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleTestKey(k.id)}
                            disabled={testingKeyId === k.id}
                            className="btn btn-ghost border border-border text-xs !py-1 !px-2 text-fg hover:border-brand"
                            title="Verify token live with Apify API"
                          >
                            <PlayCircle size={12} className={`mr-1 ${testingKeyId === k.id ? "animate-spin" : ""}`} />
                            Test
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleKeyStatus(k)}
                            className="btn btn-ghost border border-border text-xs !py-1 !px-2 text-muted hover:text-fg"
                          >
                            {k.status === "active" ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(k)}
                            className="btn btn-ghost text-xs !py-1 !px-2 text-danger hover:bg-dangerBg"
                            title="Delete key from pool"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-dashed border-border text-center space-y-2 bg-surface">
              <Server size={28} className="mx-auto text-muted" />
              <h4 className="text-xs font-semibold text-fg">No Apify API keys added yet</h4>
              <p className="text-[11px] text-muted max-w-md mx-auto leading-relaxed">
                Click &quot;Add Key to Pool&quot; above to add one or more Apify API tokens. Lead Reach AI automatically balances extraction tasks across available keys and fails over instantly if an account runs out of credits or hits rate limits.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddKeyOpen(true)}
                className="mt-2 text-xs"
              >
                <Plus size={13} className="mr-1.5" /> Add First Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Actor Configuration, Safety Limits & Cost Estimates */}
      <form onSubmit={handleSaveSettings}>
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sliders size={18} className="text-brand" /> Scraper Actors &amp; Pricing Models
                </CardTitle>
                <CardDescription>
                  Configure active Apify scraper actors, execution quotas, and unit price estimates.
                </CardDescription>
              </div>
              <Button type="submit" size="sm" disabled={settingsLoading || !hasEncryptionKey}>
                <Save size={14} className="mr-1.5" />
                {settingsLoading ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-0">
            {/* Section 1: Configured Actor IDs */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Cloud size={16} className="text-brand" /> Configured Actor Identifiers
              </div>
              <p className="text-xs text-muted">
                Underlying Apify actor IDs used across Lead Generation modules.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Google Maps Scraper Actor"
                  type="text"
                  value={settings.actors.google_maps}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      actors: { ...settings.actors, google_maps: e.target.value.trim() },
                    })
                  }
                  helperText="Default: kaix/google-maps-places-scraper (~$0.08 per 1,000 places)"
                  className="font-mono text-xs"
                  required
                />

                <Input
                  label="Meta Ads Scraper Actor"
                  type="text"
                  value={settings.actors.meta_ads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      actors: { ...settings.actors, meta_ads: e.target.value.trim() },
                    })
                  }
                  helperText="Default: igolaizola/facebook-ad-library-scraper (~$0.80 per 1,000 ads)"
                  className="font-mono text-xs"
                  required
                />

                <Input
                  label="B2B Leads Scraper Actor"
                  type="text"
                  value={settings.actors.b2b_leads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      actors: { ...settings.actors, b2b_leads: e.target.value.trim() },
                    })
                  }
                  helperText="Default: disarming_screw-owner/1-2-000-leads-apollo-scraper-replacement-b2b-b2c-leads (Apollo & ZoomInfo Alternative, $0.50/1k leads — includes mobile and email)"
                  className="font-mono text-xs"
                  required
                />
              </div>
            </div>

            {/* Section 2: Global Limits */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <Layers size={16} className="text-brand" /> Global Run Safety Limits
              </div>
              <p className="text-xs text-muted">
                Protective caps applied to prevent unexpected Apify charges and resource abuse.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Max Search Lines Per Run"
                  type="number"
                  min={1}
                  max={10}
                  value={settings.limits.maxLinesPerRun}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxLinesPerRun: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    })
                  }
                  helperText="Recommended: 5 lines"
                  required
                />

                <Input
                  label="Max Spend Per Run (USD)"
                  type="number"
                  step="0.5"
                  min={0.5}
                  max={50}
                  value={settings.limits.maxSpendUsd}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxSpendUsd: Math.max(0.5, parseFloat(e.target.value) || 0.5),
                      },
                    })
                  }
                  helperText="Passes maxTotalChargeUsd to Apify"
                  required
                />

                <Input
                  label="Per-User Max Concurrent Jobs"
                  type="number"
                  min={1}
                  max={5}
                  value={settings.limits.maxConcurrentPerUser}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxConcurrentPerUser: Math.max(1, parseInt(e.target.value, 10) || 1),
                      },
                    })
                  }
                  helperText="Default: 1 concurrent per user"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3 pt-2">
                <Input
                  label="Max Leads: Google Maps"
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.limits.maxLeadsPerRun.google_maps}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxLeadsPerRun: {
                          ...settings.limits.maxLeadsPerRun,
                          google_maps: Math.max(1, parseInt(e.target.value, 10) || 1),
                        },
                      },
                    })
                  }
                  helperText="Max places per search (1–1000 safety ceiling)"
                  required
                />

                <Input
                  label="Max Leads: Meta Ads"
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.limits.maxLeadsPerRun.meta_ads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxLeadsPerRun: {
                          ...settings.limits.maxLeadsPerRun,
                          meta_ads: Math.max(1, parseInt(e.target.value, 10) || 1),
                        },
                      },
                    })
                  }
                  helperText="Max advertisers per search (1–1000 safety ceiling)"
                  required
                />

                <Input
                  label="Max Leads: B2B Leads"
                  type="number"
                  min={1}
                  max={1000}
                  value={settings.limits.maxLeadsPerRun.b2b_leads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      limits: {
                        ...settings.limits,
                        maxLeadsPerRun: {
                          ...settings.limits.maxLeadsPerRun,
                          b2b_leads: Math.max(1, parseInt(e.target.value, 10) || 1),
                        },
                      },
                    })
                  }
                  helperText="Max decision makers per run (1–1000 safety ceiling)"
                  required
                />
              </div>
            </div>

            {/* Section 3: Cost Estimates */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                <DollarSign size={16} className="text-brand" /> Cost Estimates (USD per record)
              </div>
              <p className="text-xs text-muted">
                Transparent per-record pricing used in UI cost estimator previews.
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label="Google Maps Unit Price"
                  type="number"
                  step="0.00001"
                  min={0.00001}
                  value={settings.unitPrices.google_maps}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      unitPrices: {
                        ...settings.unitPrices,
                        google_maps: parseFloat(e.target.value) || 0.00008,
                      },
                    })
                  }
                  helperText="Default: $0.00008 / place (~$0.08 per 1,000)"
                  required
                />

                <Input
                  label="Meta Ads Unit Price"
                  type="number"
                  step="0.0001"
                  min={0.0001}
                  value={settings.unitPrices.meta_ads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      unitPrices: {
                        ...settings.unitPrices,
                        meta_ads: parseFloat(e.target.value) || 0.0008,
                      },
                    })
                  }
                  helperText="Default: $0.0008 / ad (~$0.80 per 1,000)"
                  required
                />

                <Input
                  label="B2B Leads Unit Price"
                  type="number"
                  step="0.001"
                  min={0.001}
                  value={settings.unitPrices.b2b_leads}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      unitPrices: {
                        ...settings.unitPrices,
                        b2b_leads: parseFloat(e.target.value) || 0.002,
                      },
                    })
                  }
                  helperText="Default: $0.002 / lead"
                  required
                />
              </div>
            </div>

            {settingsSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{settingsSuccess}</span>
              </div>
            )}

            {settingsError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{settingsError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      {/* Card 3: Legacy Master Token (Backward-Compatibility Fallback) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xs font-semibold text-fg flex items-center gap-2">
                <Key size={14} className="text-muted" /> Legacy Fallback Token
              </CardTitle>
              <CardDescription className="text-[11px]">
                Single master token stored in system_settings. Used automatically when key pool is empty.
              </CardDescription>
            </div>
            {maskedToken && (
              <span className="font-mono text-xs font-semibold text-fg rounded bg-surface px-2 py-0.5 border border-border">
                {maskedToken}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <form onSubmit={handleSaveToken} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-12 items-end">
              <div className="sm:col-span-9 space-y-1">
                <label className="label text-xs font-medium">Update Fallback Token</label>
                <input
                  type="password"
                  placeholder="Paste replacement fallback token"
                  value={newTokenInput}
                  onChange={(e) => setNewTokenInput(e.target.value)}
                  className="input h-9 text-xs font-mono w-full"
                />
              </div>
              <div className="sm:col-span-3">
                <Button
                  type="submit"
                  size="sm"
                  disabled={tokenLoading || !newTokenInput.trim() || !hasEncryptionKey}
                  className="w-full h-9 text-xs"
                >
                  <Save size={13} className="mr-1.5" />
                  {tokenLoading ? "Saving..." : "Update Token"}
                </Button>
              </div>
            </div>

            {tokenSuccess && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>{tokenSuccess}</span>
              </div>
            )}

            {tokenError && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle size={13} className="shrink-0" />
                <span>{tokenError}</span>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
