"use client";

import { useState } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import type { SafeApiKey } from "@/server/api-keys/types";

export function ApiKeysManager({ initialKeys }: { initialKeys: SafeApiKey[] }) {
  const [keys, setKeys] = useState<SafeApiKey[]>(initialKeys);
  const [label, setLabel] = useState("");
  const [keyValue, setKeyValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, key: keyValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add API key");
      }
      setKeys((prev) => [data.data, ...prev]);
      setLabel("");
      setKeyValue("");
      if (data.test_error) {
        setError(`Saved, but key test failed: ${data.test_error}`);
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
    try {
      const res = await fetch(`/api/v1/api-keys/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Test failed");
      setKeys((prev) => prev.map((k) => (k.id === id ? data.data : k)));
      if (!data.success) {
        setError(`Test failed: ${data.error}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to test key");
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) return;
    try {
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      alert("Failed to delete key");
    }
  };

  return (
    <div className="space-y-8">
      {/* Add new key card */}
      <div className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold">Add New OpenAI Key</h2>
        <p className="mt-1 text-xs text-muted">
          Your key will be encrypted with AES-256-GCM. We never return the raw key to the client.
        </p>

        <form onSubmit={handleAddKey} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Key Label</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Production OpenAI Key"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div>
            <label className="label">API Key</label>
            <input
              type="password"
              className="input font-mono text-xs"
              placeholder="sk-proj-..."
              required
              value={keyValue}
              onChange={(e) => setKeyValue(e.target.value)}
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Plus size={16} /> {loading ? "Testing & Saving..." : "Add Key"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-2.5 text-xs text-danger">
            {error}
          </div>
        )}
      </div>

      {/* Keys list */}
      <div className="glass rounded-3xl p-6">
        <h2 className="text-lg font-bold">Configured API Keys</h2>
        <p className="mt-1 text-xs text-muted">
          Used across Social Post campaigns and AI Outreach modules.
        </p>

        <div className="mt-4 divide-y divide-border">
          {keys.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted">
              No API keys configured yet. Add one above to enable AI features.
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between py-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{k.label}</span>
                    <span className="badge font-mono text-xs">
                      sk-…{k.key_last4}
                    </span>
                    {k.status === "active" ? (
                      <span className="flex items-center gap-1 text-[11px] text-accent-green">
                        <CheckCircle2 size={13} /> Active
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-danger">
                        <XCircle size={13} /> Invalid
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted">
                    Provider: {k.provider.toUpperCase()} • Added on{" "}
                    {new Date(k.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestKey(k.id)}
                    disabled={testingId === k.id}
                    className="btn btn-ghost !p-2 text-xs"
                    title="Test Key"
                  >
                    <RotateCcw
                      size={15}
                      className={testingId === k.id ? "animate-spin" : ""}
                    />
                  </button>
                  <button
                    onClick={() => handleDeleteKey(k.id)}
                    className="btn btn-ghost !p-2 text-xs text-danger hover:border-danger"
                    title="Delete Key"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
