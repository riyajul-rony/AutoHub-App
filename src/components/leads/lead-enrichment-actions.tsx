"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeadEnrichmentActionsProps {
  leadId: string;
  hasEmail: boolean;
  website?: string;
  companyName: string;
}

export function SingleLeadEnrichButton({
  leadId,
  hasEmail,
  website,
  companyName,
}: LeadEnrichmentActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleEnrich = async () => {
    if (!website && !companyName) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/enrich`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enrich lead");
      }
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  if (hasEmail && !success) {
    return (
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="text-[11px] text-muted hover:text-fg inline-flex items-center gap-1 transition-colors"
        title="Re-crawl website for updated contacts & decision makers"
      >
        <RefreshCw size={11} className={loading ? "animate-spin text-fg" : ""} />
        <span>Re-scan</span>
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <Button
        variant={success ? "secondary" : "secondary"}
        size="sm"
        onClick={handleEnrich}
        disabled={loading}
        className="h-7 text-[11px] px-2"
      >
        {loading ? (
          <>
            <RefreshCw size={11} className="animate-spin mr-1" />
            <span>Scanning...</span>
          </>
        ) : success ? (
          <>
            <Check size={11} className="text-success mr-1" />
            <span className="text-success">Enriched</span>
          </>
        ) : (
          <>
            <Sparkles size={11} className="mr-1" />
            <span>Find Email</span>
          </>
        )}
      </Button>
      {error && (
        <span className="text-[10px] text-danger truncate max-w-[120px]" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

export function BatchEnrichButton({
  unenrichedLeadIds,
}: {
  unenrichedLeadIds: string[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleBatchEnrich = async () => {
    if (unenrichedLeadIds.length === 0) return;
    setLoading(true);
    setStatus(`Scanning ${unenrichedLeadIds.length} websites...`);

    try {
      const res = await fetch("/api/v1/leads/enrich-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: unenrichedLeadIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Batch enrichment failed");
      }
      setStatus(`Enriched ${data.data?.enrichedCount || 0} leads!`);
      router.refresh();
      setTimeout(() => setStatus(null), 4000);
    } catch (err: any) {
      setStatus(`Failed: ${err.message}`);
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  if (unenrichedLeadIds.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleBatchEnrich}
        disabled={loading}
        icon={
          loading ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )
        }
      >
        <span>
          {loading ? `Enriching (${unenrichedLeadIds.length})...` : "Batch Find Emails"}
        </span>
      </Button>
      {status && <span className="text-xs text-muted font-medium">{status}</span>}
    </div>
  );
}
