"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, RefreshCw, AlertCircle, Filter, CheckCircle2, MapPin, Building2, Briefcase, ExternalLink } from "lucide-react";

interface LeadSearchItem {
  id: string;
  source: string;
  params: any;
  found_count: number;
  enriched_count: number;
  created_at: string;
  status: string;
}

interface LeadSearchPickerProps {
  initialSearchId?: string;
  onValidated: (result: {
    recipients: any[];
    summary: {
      total: number;
      valid: number;
      duplicates: number;
      suppressed: number;
      invalidSyntax: number;
    };
    preview: any[];
    searchId: string;
    searchLabel: string;
  }) => void;
  isProcessing?: boolean;
}

export function LeadSearchPicker({ initialSearchId, onValidated, isProcessing }: LeadSearchPickerProps) {
  const [searches, setSearches] = useState<LeadSearchItem[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState<string>(initialSearchId || "");
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters
  const [onlyWithEmail, setOnlyWithEmail] = useState(true);
  const [onlyEnriched, setOnlyEnriched] = useState(false);

  useEffect(() => {
    fetchSearches();
  }, []);

  const fetchSearches = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/leads/searches");
      const json = await res.json();
      if (res.ok && json.data?.searches) {
        setSearches(json.data.searches);
        const targetId = initialSearchId && json.data.searches.some((s: any) => s.id === initialSearchId)
          ? initialSearchId
          : json.data.searches.find((s: any) => (s.found_count ?? 0) > 0)?.id || json.data.searches[0]?.id || "";
        setSelectedSearchId(targetId);
        if (targetId) {
          triggerValidation(targetId, onlyWithEmail, onlyEnriched, json.data.searches);
        }
      }
    } catch {
      setErrorMsg("Failed to load saved lead searches.");
    } finally {
      setLoading(false);
    }
  };

  const triggerValidation = async (
    searchId: string,
    withEmail: boolean,
    enriched: boolean,
    currentSearches = searches
  ) => {
    if (!searchId) return;

    setValidating(true);
    setErrorMsg(null);

    const s = currentSearches.find((item) => item.id === searchId);
    const searchLabel = s
      ? `${s.params?.keyword || s.params?.niche || "Leads"} (${s.params?.location || "Area"})`
      : "Lead Search Run";

    try {
      const res = await fetch("/api/v1/outreach/recipients/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "leads",
          searchId,
          onlyWithEmail: withEmail,
          onlyEnriched: enriched,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to validate leads.");
      }

      onValidated({
        recipients: json.data.validRecipients,
        summary: json.data.summary,
        preview: json.data.preview,
        searchId,
        searchLabel,
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Error validating leads from search.");
    } finally {
      setValidating(false);
    }
  };

  const selectedSearch = searches.find((s) => s.id === selectedSearchId);

  const getSourceIcon = (source: string) => {
    if (source === "google_maps") return <MapPin className="w-3.5 h-3.5 text-accent-green" />;
    if (source === "linkedin") return <Briefcase className="w-3.5 h-3.5 text-brand" />;
    return <Building2 className="w-3.5 h-3.5 text-accent-blue" />;
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-surface/30 border border-border text-center text-xs text-muted flex items-center justify-center gap-2">
        <RefreshCw className="w-4 h-4 animate-spin text-brand" />
        Loading previous lead searches...
      </div>
    );
  }

  if (searches.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-surface/40 border border-border text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
          <Search className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold">No Saved Lead Searches</h4>
        <p className="text-xs text-muted max-w-sm mx-auto">
          You haven&apos;t run any lead searches yet. Use our Lead Generation modules to extract verified prospects.
        </p>
        <div className="pt-2 flex justify-center gap-2">
          <Link
            href="/app/leads/google_maps"
            className="btn btn-primary text-xs inline-flex items-center gap-1.5"
          >
            <MapPin className="w-3.5 h-3.5" />
            Google Maps Scraper
          </Link>
          <Link
            href="/app/leads/linkedin"
            className="btn btn-ghost text-xs inline-flex items-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            B2B Leads Finder
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/30 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Search Run Selector */}
      <div className="border border-border/80 rounded-2xl p-4 bg-surface/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">Select Lead Search Run</label>
          <button
            type="button"
            onClick={fetchSearches}
            className="btn btn-ghost text-xs text-muted hover:text-foreground py-1 px-2"
          >
            <RefreshCw className="w-3 h-3 mr-1" /> Refresh
          </button>
        </div>

        <select
          value={selectedSearchId}
          onChange={(e) => {
            const newId = e.target.value;
            setSelectedSearchId(newId);
            triggerValidation(newId, onlyWithEmail, onlyEnriched);
          }}
          className="input w-full text-xs"
        >
          {searches.map((s) => {
            const kw = s.params?.keyword || s.params?.niche || s.params?.titles?.[0] || "Search";
            const loc = s.params?.location || s.params?.country || "";
            return (
              <option key={s.id} value={s.id}>
                [{s.source?.toUpperCase()}] {kw} {loc ? `in ${loc}` : ""} — {s.found_count} leads (
                {new Date(s.created_at).toLocaleDateString()})
              </option>
            );
          })}
        </select>

        {/* Selected Search Metadata Pills */}
        {selectedSearch && (
          <div className="p-3 rounded-xl bg-surface/60 border border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-surface border border-border">
                {getSourceIcon(selectedSearch.source)}
              </span>
              <span className="font-medium">
                {selectedSearch.params?.keyword || selectedSearch.params?.niche || "Keyword"}
              </span>
              <span className="text-muted">•</span>
              <span className="text-muted">
                {selectedSearch.params?.location || selectedSearch.params?.country || "Worldwide"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="badge text-[10px] border-border text-muted">
                Total Found: <strong className="text-foreground ml-1">{selectedSearch.found_count}</strong>
              </span>
              <span className="badge text-[10px] border-brand/40 text-brand">
                Enriched: <strong className="ml-1">{selectedSearch.enriched_count}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="pt-2 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-muted font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Criteria:</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyWithEmail}
              onChange={(e) => {
                const val = e.target.checked;
                setOnlyWithEmail(val);
                triggerValidation(selectedSearchId, val, onlyEnriched);
              }}
              className="checkbox checkbox-sm"
            />
            <span>Only leads with valid email address</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyEnriched}
              onChange={(e) => {
                const val = e.target.checked;
                setOnlyEnriched(val);
                triggerValidation(selectedSearchId, onlyWithEmail, val);
              }}
              className="checkbox checkbox-sm"
            />
            <span>Only enriched leads</span>
          </label>
        </div>
      </div>
    </div>
  );
}
