"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, RotateCcw, ShieldCheck, Key, Database, Sparkles, AlertCircle } from "lucide-react";
import type { SafeApiKey, ApiKeyProviderType } from "@/server/api-keys/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ApiKeysManager({ initialKeys }: { initialKeys: SafeApiKey[] }) {
  const [keys, setKeys] = useState<SafeApiKey[]>(initialKeys);
  const [provider, setProvider] = useState<ApiKeyProviderType>("bright_data");
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, label, key: keyValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add API key");
      }
      setKeys((prev) => [data.data, ...prev]);
      setLabel("");
      setKeyValue("");

      if (data.test_error) {
        setError(`Saved, but initial connection test failed: ${data.test_error}`);
      } else {
        setSuccessMsg(`Successfully saved and verified ${provider === "bright_data" ? "Bright Data" : "OpenAI"} API key!`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleTestKey = async (id: string) => {
    setTestingId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/api-keys/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Connection test failed");
      
      setKeys((prev) => prev.map((k) => (k.id === id ? data.data : k)));
      
      if (!data.success) {
        setError(`Connection test failed: ${data.error || "Invalid key"}`);
      } else {
        const balanceNotice = data.balance !== undefined ? ` (Balance: $${data.balance})` : "";
        setSuccessMsg(`Connection verified successfully!${balanceNotice}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to test connection");
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to remove this API key? Features using this provider will stop working until a new key is added.")) return;
    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
        setSuccessMsg("API key deleted successfully.");
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete key");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete key");
    }
  };

  return (
    <div className="space-y-6">
      {/* Add new key card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key size={18} className="text-brand" /> Add Service API Key
              </CardTitle>
              <CardDescription>
                Keys are encrypted at rest with AES-256-GCM. We never log or expose your full plaintext secret.
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-accent-green bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md self-start font-medium">
              <ShieldCheck size={14} /> AES-256-GCM
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-0">
          <form onSubmit={handleAddKey} className="space-y-4">
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-medium text-text-muted mb-2">Select Provider</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setProvider("bright_data")}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                    provider === "bright_data"
                      ? "border-brand bg-brand/5 shadow-xs"
                      : "border-border hover:border-border-input bg-surface"
                  }`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-brand/10 text-brand shrink-0">
                    <Database size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-fg flex items-center gap-2">
                      Bright Data <Badge variant="accent" size="sm">Lead Gen</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      Required for Google Maps, Meta Ads & LinkedIn scrapers
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider("openai")}
                  className={`flex items-start gap-3 p-3.5 rounded-lg border text-left transition-all ${
                    provider === "openai"
                      ? "border-brand bg-brand/5 shadow-xs"
                      : "border-border hover:border-border-input bg-surface"
                  }`}
                >
                  <div className="grid h-8 w-8 place-items-center rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-fg flex items-center gap-2">
                      OpenAI <Badge variant="neutral" size="sm">AI Copy</Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      For AI social post generation and founder extraction
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Key Label / Friendly Name"
                type="text"
                placeholder={provider === "bright_data" ? "My Bright Data Account" : "My OpenAI Key"}
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />

              <Input
                label="API Secret Key"
                type="password"
                className="font-mono text-xs"
                placeholder={provider === "bright_data" ? "e.g. 7f8a9b3c4d5e..." : "sk-proj-..."}
                required
                value={keyValue}
                onChange={(e) => setKeyValue(e.target.value)}
                helperText={provider === "bright_data" ? "From Bright Data Dashboard" : "Starts with sk-"}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-muted">
                AutoHub will perform a connection test upon saving.
              </span>
              <Button type="submit" size="sm" disabled={loading}>
                <Plus size={14} className="mr-1.5" /> {loading ? "Verifying & Saving..." : "Save & Verify Key"}
              </Button>
            </div>
          </form>

          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle>Configured API Keys</CardTitle>
          <CardDescription>
            Your active credentials used by the scraping engine and AI workers.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="divide-y divide-border">
            {keys.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted">
                <Key size={32} className="mx-auto mb-2 text-muted/40" />
                No API keys configured yet. Add your Bright Data key above to start generating leads.
              </div>
            ) : (
              keys.map((k) => (
                <div key={k.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-semibold text-sm text-fg">{k.label}</span>
                      <Badge variant={k.provider === "bright_data" ? "accent" : "neutral"} size="sm">
                        {k.provider.replace("_", " ")}
                      </Badge>
                      <span className="font-mono text-xs rounded bg-bgSubtle px-2 py-0.5 text-muted border border-border">
                        ••••••••{k.key_last4}
                      </span>
                      {k.status === "active" ? (
                        <span className="flex items-center gap-1 text-xs text-accent-green font-medium">
                          <CheckCircle2 size={13} /> Active & Connected
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-danger font-medium">
                          <XCircle size={13} /> Connection Failed
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted flex items-center gap-3">
                      <span>Added on {new Date(k.created_at).toLocaleDateString()}</span>
                      {k.last_tested_at && (
                        <span>• Last checked: {new Date(k.last_tested_at).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTestKey(k.id)}
                      disabled={testingId === k.id}
                      title="Test connection with provider"
                    >
                      <RotateCcw
                        size={13}
                        className={`mr-1.5 ${testingId === k.id ? "animate-spin text-brand" : ""}`}
                      />
                      <span>{testingId === k.id ? "Checking..." : "Test"}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteKey(k.id)}
                      className="text-muted hover:text-red-500"
                      title="Delete Key"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
