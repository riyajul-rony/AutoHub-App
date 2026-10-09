"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Globe,
  Copy,
  Download,
  Check,
  ExternalLink,
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Building2,
  Eye,
  X,
  Key,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  Trash2,
  FileSpreadsheet,
  Filter,
  ChevronDown,
} from "lucide-react";

function GoogleSheetsIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M30 4H10C7.79 4 6 5.79 6 8V40C6 42.21 7.79 44 10 44H38C40.21 44 42 42.21 42 40V16L30 4Z" fill="#0F9D58" />
      <path d="M30 4V16H42L30 4Z" fill="#87CEAB" />
      <rect x="14" y="22" width="20" height="14" rx="1.5" fill="#FFFFFF" />
      <path d="M14 27H34M14 32H34M24 22V36" stroke="#0F9D58" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export interface ComprehensiveLead {
  // Company Info (1 - 10)
  company_name: string;
  company_emails: string[];
  company_phones: string[];
  company_website?: string;
  company_facebook?: string;
  company_instagram?: string;
  company_linkedin?: string;
  company_tiktok?: string;
  company_youtube?: string;
  company_location: string;

  // Founder Info (11 - 14)
  founder_name?: string;
  founder_emails: string[];
  founder_phones: string[];
  founder_socials: string[];

  // Manager Info (15 - 18)
  manager_name?: string;
  manager_emails: string[];
  manager_phones: string[];
  manager_socials: string[];

  // Display aliases
  rating?: number;
  city?: string;
  address?: string;
  website?: string;
}

export type LeadFieldId =
  | "company_name"
  | "company_location"
  | "company_website"
  | "company_emails"
  | "company_phones"
  | "company_facebook"
  | "company_instagram"
  | "company_linkedin"
  | "company_tiktok"
  | "company_youtube"
  | "founder_name"
  | "founder_emails"
  | "founder_phones"
  | "founder_socials"
  | "manager_name"
  | "manager_emails"
  | "manager_phones"
  | "manager_socials";

export interface FieldConfig {
  id: LeadFieldId;
  label: string;
  category: "Company (1-10)" | "Founder (11-14)" | "Manager (15-18)";
}

export const ALL_18_FIELDS: FieldConfig[] = [
  // Company Level (1 - 10)
  { id: "company_name", label: "Company Name", category: "Company (1-10)" },
  { id: "company_location", label: "Address & Location", category: "Company (1-10)" },
  { id: "company_website", label: "Website", category: "Company (1-10)" },
  { id: "company_emails", label: "Company Emails", category: "Company (1-10)" },
  { id: "company_phones", label: "Company Phones", category: "Company (1-10)" },
  { id: "company_facebook", label: "Facebook", category: "Company (1-10)" },
  { id: "company_instagram", label: "Instagram", category: "Company (1-10)" },
  { id: "company_linkedin", label: "LinkedIn", category: "Company (1-10)" },
  { id: "company_tiktok", label: "TikTok", category: "Company (1-10)" },
  { id: "company_youtube", label: "YouTube", category: "Company (1-10)" },

  // Founder Level (11 - 14)
  { id: "founder_name", label: "Founder Name", category: "Founder (11-14)" },
  { id: "founder_emails", label: "Founder Emails", category: "Founder (11-14)" },
  { id: "founder_phones", label: "Founder Phones", category: "Founder (11-14)" },
  { id: "founder_socials", label: "Founder Socials", category: "Founder (11-14)" },

  // Manager Level (15 - 18)
  { id: "manager_name", label: "Manager Name", category: "Manager (15-18)" },
  { id: "manager_emails", label: "Manager Emails", category: "Manager (15-18)" },
  { id: "manager_phones", label: "Manager Phones", category: "Manager (15-18)" },
  { id: "manager_socials", label: "Manager Socials", category: "Manager (15-18)" },
];

function formatField(val: any): string {
  if (Array.isArray(val)) {
    if (val.length === 0) return "Not Available";
    const cleaned = val
      .map((item) => String(item).replace(/^\+/, "").trim())
      .filter((item) => item && item !== "Not Available" && item !== "—");
    return cleaned.length > 0 ? cleaned.join("; ") : "Not Available";
  }
  if (!val || String(val).trim() === "" || String(val).trim() === "#ERROR!" || String(val).trim() === "—") {
    return "Not Available";
  }
  return String(val).replace(/^\+/, "").trim();
}

function getLeadFieldValue(l: ComprehensiveLead, fieldId: LeadFieldId): string {
  switch (fieldId) {
    case "company_name":
      return formatField(l.company_name);
    case "company_location":
      return formatField(l.company_location || l.address || l.city);
    case "company_website":
      return formatField(l.company_website || l.website);
    case "company_emails":
      return formatField(l.company_emails);
    case "company_phones":
      return formatField(l.company_phones);
    case "company_facebook":
      return formatField(l.company_facebook);
    case "company_instagram":
      return formatField(l.company_instagram);
    case "company_linkedin":
      return formatField(l.company_linkedin);
    case "company_tiktok":
      return formatField(l.company_tiktok);
    case "company_youtube":
      return formatField(l.company_youtube);
    case "founder_name":
      return formatField(l.founder_name);
    case "founder_emails":
      return formatField(l.founder_emails);
    case "founder_phones":
      return formatField(l.founder_phones);
    case "founder_socials":
      return formatField(l.founder_socials);
    case "manager_name":
      return formatField(l.manager_name);
    case "manager_emails":
      return formatField(l.manager_emails);
    case "manager_phones":
      return formatField(l.manager_phones);
    case "manager_socials":
      return formatField(l.manager_socials);
  }
}


function hasLeadFieldValue(l: ComprehensiveLead, fieldId: LeadFieldId): boolean {
  const val = getLeadFieldValue(l, fieldId);
  return Boolean(val && val !== "Not Available" && val !== "—" && val.trim() !== "");
}

export function LiveLeadsFinder({ source: _source }: { source: string }) {
  const [keyword, setKeyword] = useState("Dentist");
  const [location, setLocation] = useState("Dhaka");
  const [maxResults, setMaxResults] = useState(15);
  const [findEmails, setFindEmails] = useState(true);
  const [onlyWithWebsite, setOnlyWithWebsite] = useState(true);

  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [leads, setLeads] = useState<ComprehensiveLead[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Selected lead for full 18-attribute inspector modal
  const [selectedLead, setSelectedLead] = useState<ComprehensiveLead | null>(null);

  // 18-Field Data Presence Filter (filters which leads are shown based on ticked required fields)
  const [requiredFields, setRequiredFields] = useState<LeadFieldId[]>([]);
  const [filterMatchMode, setFilterMatchMode] = useState<"all" | "any">("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilterDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter leads based on ticked required fields
  const filteredLeads = useMemo(() => {
    if (requiredFields.length === 0) return leads;
    return leads.filter((lead) => {
      if (filterMatchMode === "all") {
        return requiredFields.every((fId) => hasLeadFieldValue(lead, fId));
      } else {
        return requiredFields.some((fId) => hasLeadFieldValue(lead, fId));
      }
    });
  }, [leads, requiredFields, filterMatchMode]);

  // Google Places API Key state
  const [googleKeyStatus, setGoogleKeyStatus] = useState<{ connected: boolean; key_last4: string | null } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keyLoading, setKeyLoading] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [keySuccess, setKeySuccess] = useState<string | null>(null);

  // Google Account & Sheets state
  const [googleAuthStatus, setGoogleAuthStatus] = useState<{
    connected: boolean;
    email?: string;
    clientConfigured: boolean;
  } | null>(null);
  const [exportingSheets, setExportingSheets] = useState(false);
  const [exportedSheetUrl, setExportedSheetUrl] = useState<string | null>(null);

  // Google OAuth configuration modal state
  const [showGoogleAuthModal, setShowGoogleAuthModal] = useState(false);
  const [googleClientIdInput, setGoogleClientIdInput] = useState("");
  const [googleClientSecretInput, setGoogleClientSecretInput] = useState("");
  const [googleConfigLoading, setGoogleConfigLoading] = useState(false);
  const [googleConfigError, setGoogleConfigError] = useState<string | null>(null);

  // Load key & auth status on mount + restore saved search inputs
  useEffect(() => {
    // Restore user-entered search params so they never disappear on reload
    try {
      const savedKw = sessionStorage.getItem("autohub_lead_kw");
      if (savedKw) setKeyword(savedKw);
      const savedLoc = sessionStorage.getItem("autohub_lead_loc");
      if (savedLoc) setLocation(savedLoc);
      const savedMax = sessionStorage.getItem("autohub_lead_max");
      if (savedMax) setMaxResults(Number(savedMax));
      const savedOnlyWeb = sessionStorage.getItem("autohub_lead_only_web");
      if (savedOnlyWeb !== null) setOnlyWithWebsite(savedOnlyWeb === "true");
      const savedEmails = sessionStorage.getItem("autohub_lead_emails");
      if (savedEmails !== null) setFindEmails(savedEmails === "true");
    } catch {}

    // 1. Google Places Key status
    fetch("/api/v1/leads/google-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setGoogleKeyStatus(data.data);
        }
      })
      .catch(() => {});

    // 2. Google Account OAuth status
    fetch("/api/v1/auth/google/status")
      .then((res) => res.json())
      .then((data) => {
        if (data.data) {
          setGoogleAuthStatus(data.data);
        }
      })
      .catch(() => {});

    // 3. Check URL query params for oauth redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("google_connected") === "true") {
        setTimeout(() => {
          setStatusMessage("Google Account connected successfully! You can now 1-click export leads to Google Sheets.");
        }, 0);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  const handleConnectKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyLoading(true);
    setKeyError(null);
    setKeySuccess(null);

    try {
      const res = await fetch("/api/v1/leads/google-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify key");
      }
      setGoogleKeyStatus(data.data);
      setKeySuccess("Google Places API key verified and connected successfully!");
      setKeyInput("");
      setTimeout(() => {
        setShowKeyModal(false);
        setKeySuccess(null);
      }, 1500);
    } catch (err: any) {
      setKeyError(err.message);
    } finally {
      setKeyLoading(false);
    }
  };

  const handleDisconnectKey = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Places API key? Searches will fall back to OpenStreetMap.")) {
      return;
    }
    try {
      await fetch("/api/v1/leads/google-key", { method: "DELETE" });
      setGoogleKeyStatus({ connected: false, key_last4: null });
    } catch (err: any) {
      alert("Failed to disconnect key: " + err.message);
    }
  };

  const handleSaveGoogleConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleConfigLoading(true);
    setGoogleConfigError(null);
    try {
      const res = await fetch("/api/v1/auth/google/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: googleClientIdInput.trim(),
          clientSecret: googleClientSecretInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save Google credentials");
      // Refresh status
      const statusRes = await fetch("/api/v1/auth/google/status");
      const statusData = await statusRes.json();
      if (statusData.data) setGoogleAuthStatus(statusData.data);
      // Redirect to Google OAuth start
      window.location.href = "/api/v1/auth/google/start?returnTo=/app/leads/google_maps";
    } catch (err: any) {
      setGoogleConfigError(err.message);
    } finally {
      setGoogleConfigLoading(false);
    }
  };

  const copyFormattedLeadsToClipboard = async (): Promise<boolean> => {
    if (filteredLeads.length === 0) return false;
    const headersList = ALL_18_FIELDS.map((f) => f.label);

    const tsvHeaders = headersList.join("\t");
    const tsvRows = filteredLeads.map((l) =>
      ALL_18_FIELDS
        .map((f) => String(getLeadFieldValue(l, f.id)).replace(/[\t\r\n]+/g, " ").trim())
        .join("\t")
    );
    const tsvContent = [tsvHeaders, ...tsvRows].join("\r\n");

    const htmlTable = `<table><thead><tr style="background:#1e293b;color:#ffffff;font-weight:bold;">${headersList
      .map((h) => `<th style="padding:8px 12px;border:1px solid #cbd5e1;background:#1e293b;color:#ffffff;">${h}</th>`)
      .join("")}</tr></thead><tbody>${filteredLeads
      .map(
        (l) =>
          `<tr>${ALL_18_FIELDS
            .map((f) => getLeadFieldValue(l, f.id))
            .map(
              (v) =>
                `<td style="padding:6px 10px;border:1px solid #e2e8f0;">${String(v)
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;")}</td>`
            )
            .join("")}</tr>`
      )
      .join("")}</tbody></table>`;

    try {
      if (typeof window !== "undefined" && navigator.clipboard && window.ClipboardItem) {
        const textBlob = new Blob([tsvContent], { type: "text/plain" });
        const htmlBlob = new Blob([htmlTable], { type: "text/html" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": textBlob,
            "text/html": htmlBlob,
          }),
        ]);
        return true;
      }
    } catch {}

    try {
      await navigator.clipboard.writeText(tsvContent);
      return true;
    } catch {
      return false;
    }
  };

  const handleExportGoogleSheets = async () => {
    if (filteredLeads.length === 0) return;

    // 1. If connected with Google OAuth, create and populate directly in Google Drive
    if (googleAuthStatus?.connected) {
      setExportingSheets(true);
      setStatusMessage("Creating Google Spreadsheet directly in your Google Drive...");

      try {
        const exportHeaders = ALL_18_FIELDS.map((f) => f.label);
        const exportRows = filteredLeads.map((l) =>
          ALL_18_FIELDS.map((f) => getLeadFieldValue(l, f.id))
        );

        const res = await fetch("/api/v1/leads/export/google-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: filteredLeads,
            headers: exportHeaders,
            rows: exportRows,
            title: `AutoHub Leads - ${keyword} in ${location} (${new Date().toLocaleDateString()})`,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message || data.error || "Failed to export to Google Sheets");
        }

        setExportedSheetUrl(data.spreadsheetUrl);
        setStatusMessage(`Exported ${filteredLeads.length} leads directly to Google Sheets!`);
        window.open(data.spreadsheetUrl, "_blank");
        return;
      } catch (err: any) {
        setStatusMessage("Google Sheets export error: " + err.message);
      } finally {
        setExportingSheets(false);
      }
      return;
    }

    // 2. Not connected: show Google Auth Modal
    setShowGoogleAuthModal(true);
  };

  const handleDisconnectGoogleAuth = async () => {
    if (!confirm("Are you sure you want to disconnect your Google Account?")) return;
    try {
      await fetch("/api/v1/auth/google/disconnect", { method: "POST" });
      setGoogleAuthStatus({ connected: false, clientConfigured: Boolean(googleAuthStatus?.clientConfigured) });
      setStatusMessage("Google Account disconnected.");
    } catch (err: any) {
      alert("Failed to disconnect: " + err.message);
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setScraping(false);
    setStatusMessage("Operation canceled by user.");
  };

  // 1. Initial Google Maps Extraction
  const handleSearch = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const cleanKw = keyword.trim();
    const cleanLoc = location.trim();
    if (!cleanKw || !cleanLoc) {
      setStatusMessage("Please specify both a search keyword and target location.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setStatusMessage(
      googleKeyStatus?.connected
        ? `Searching official Google Places API (New) for genuine businesses in ${cleanLoc}...`
        : `Searching genuine places for up to ${maxResults} businesses from OpenStreetMap & live web crawler...`
    );

    try {
      const res = await fetch("/api/v1/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: cleanKw,
          location: cleanLoc,
          max_results: maxResults,
          find_emails: findEmails,
          only_with_website: onlyWithWebsite,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const list: ComprehensiveLead[] = data.data?.leads || [];
      setLeads(list);
      if (list.length === 0) {
        setStatusMessage(
          onlyWithWebsite
            ? `0 matching leads with active websites found for "${cleanKw}" in "${cleanLoc}". Try switching Quality Leads Filter to ALL (OFF).`
            : `No places found for "${cleanKw}" in "${cleanLoc}". Try broader keywords or city name.`
        );
      } else if (findEmails) {
        setStatusMessage(
          onlyWithWebsite
            ? `Deep Web Scraping complete: Extracted ${list.length} quality leads with verified websites, full addresses, emails, phones & social media.`
            : `Deep Web Scraping complete: Extracted ${list.length} leads with verified full addresses, emails, phones & social media.`
        );
      } else {
        setStatusMessage(
          onlyWithWebsite
            ? `Quality Map Scraper complete: Extracted ${list.length} leads with verified websites and contact details.`
            : `Basic Map Scraper complete: Extracted ${list.length} leads with verified full addresses and contact details.`
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatusMessage("Search canceled by user.");
      } else {
        setStatusMessage(`Search failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // 2. Dedicated WebScrape Trigger
  const handleDeepWebScrape = async () => {
    if (leads.length === 0) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setScraping(true);
    setStatusMessage("Crawling websites & searching web directories for authentic emails, phone numbers, founder/manager names & socials...");

    try {
      const res = await fetch("/api/v1/leads/webscrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: leads.map((l) => ({
            company_name: l.company_name,
            website: l.company_website || l.website,
            company_location: l.company_location || l.address || l.city,
            company_phones: l.company_phones,
            company_emails: l.company_emails,
            founder_name: l.founder_name,
            manager_name: l.manager_name,
            company_facebook: l.company_facebook,
            company_instagram: l.company_instagram,
            company_linkedin: l.company_linkedin,
          })),
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (data.data && Array.isArray(data.data)) {
        const byName = new Map<string, any>();
        const bySite = new Map<string, any>();

        for (const item of data.data) {
          if (item.company_name) byName.set(item.company_name.toLowerCase().trim(), item);
          if (item.company_website) bySite.set(item.company_website.replace(/\/+$/, "").toLowerCase(), item);
        }

        setLeads((prev) =>
          prev.map((lead) => {
            const nameKey = (lead.company_name || "").toLowerCase().trim();
            const siteKey = (lead.company_website || lead.website || "").replace(/\/+$/, "").toLowerCase();
            const scraped: any = byName.get(nameKey) || bySite.get(siteKey);
            if (!scraped) return lead;

            return {
              ...lead,
              company_website: scraped.company_website || lead.company_website || lead.website,
              company_emails: scraped.company_emails?.length ? scraped.company_emails : lead.company_emails,
              company_phones: scraped.company_phones?.length ? scraped.company_phones : lead.company_phones,
              company_facebook: scraped.company_facebook || lead.company_facebook,
              company_instagram: scraped.company_instagram || lead.company_instagram,
              company_linkedin: scraped.company_linkedin || lead.company_linkedin,
              company_tiktok: scraped.company_tiktok || lead.company_tiktok,
              company_youtube: scraped.company_youtube || lead.company_youtube,
              founder_name: scraped.founder_name || lead.founder_name,
              founder_emails: scraped.founder_emails?.length ? scraped.founder_emails : lead.founder_emails,
              founder_phones: scraped.founder_phones?.length ? scraped.founder_phones : lead.founder_phones,
              founder_socials: scraped.founder_socials?.length ? scraped.founder_socials : lead.founder_socials,
              manager_name: scraped.manager_name || lead.manager_name,
              manager_emails: scraped.manager_emails?.length ? scraped.manager_emails : lead.manager_emails,
              manager_phones: scraped.manager_phones?.length ? scraped.manager_phones : lead.manager_phones,
              manager_socials: scraped.manager_socials?.length ? scraped.manager_socials : lead.manager_socials,
            };
          })
        );
        setStatusMessage(`Webscrape completed: Processed genuine data from business websites and search discovery.`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatusMessage("Web scraping canceled by user.");
      } else {
        setStatusMessage(`Webscrape ended: ${err.message}`);
      }
    } finally {
      setScraping(false);
      abortControllerRef.current = null;
    }
  };

  // Export as TSV with all 18 fields
  // Export as TSV with filtered leads
  const handleCopyTsv = async () => {
    if (filteredLeads.length === 0) return;
    const ok = await copyFormattedLeadsToClipboard();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setStatusMessage(`Copied ${filteredLeads.length} leads (all 18 columns) to clipboard!`);
    }
  };

  // Export as CSV with filtered leads
  const handleDownloadCsv = () => {
    if (filteredLeads.length === 0) return;
    const headers = ALL_18_FIELDS.map((f) => `"${f.label}"`).join(",");
    const rows = filteredLeads.map((l) =>
      ALL_18_FIELDS
        .map((f) => `"${String(getLeadFieldValue(l, f.id)).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads-${filteredLeads.length}-${keyword}-${location}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Google Places API Key Banner / Connection Widget */}
      <div className="glass rounded-3xl p-4 sm:p-5 border border-border/80">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl shrink-0 ${
                googleKeyStatus?.connected
                  ? "bg-accent-green/15 text-accent-green border border-accent-green/30"
                  : "bg-brand/10 text-brand border border-brand/20"
              }`}
            >
              {googleKeyStatus?.connected ? <ShieldCheck size={20} /> : <Key size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-fg">
                  {googleKeyStatus?.connected
                    ? `Google Places API Connected (${googleKeyStatus.key_last4})`
                    : "Google Places API (New) Key: Optional"}
                </h3>
                {googleKeyStatus?.connected ? (
                  <span className="badge border-accent-green/40 text-accent-green text-[10px] px-2 py-0.5 font-medium">
                    Live Active
                  </span>
                ) : (
                  <span className="badge border-muted/30 text-muted text-[10px] px-2 py-0.5">
                    Free Fallback Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {googleKeyStatus?.connected
                  ? "Searches run directly against official Google Places database with authentic ratings, review counts & verified business websites."
                  : "Using free OpenStreetMap & public web crawler. Connect your Google Cloud API key for 100% genuine Google Maps places & ratings."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
            {googleKeyStatus?.connected ? (
              <button
                type="button"
                onClick={handleDisconnectKey}
                className="btn btn-ghost text-xs text-accent-pink hover:bg-accent-pink/10 border border-accent-pink/30 flex items-center gap-1.5"
                title="Disconnect your Google Places API Key"
              >
                <Trash2 size={13} /> Disconnect Key
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setKeyError(null);
                  setKeySuccess(null);
                  setShowKeyModal(true);
                }}
                className="btn btn-primary text-xs flex items-center gap-1.5"
                title="Connect your personal Google Cloud Places API key"
              >
                <Sparkles size={13} /> Connect Google Key
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="glass rounded-3xl p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearch(e);
          }}
          action="#"
          method="dialog"
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Search Keyword / Niche</label>
              <input
                type="text"
                className="input"
                required
                placeholder="e.g. Real Estate Agency, Dental Clinic, Gym"
                value={keyword}
                onChange={(e) => {
                  setKeyword(e.target.value);
                  try { sessionStorage.setItem("autohub_lead_kw", e.target.value); } catch {}
                }}
              />
            </div>

            <div>
              <label className="label">City / Target Location</label>
              <input
                type="text"
                className="input"
                required
                placeholder="e.g. Dhaka, Chittagong, London"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  try { sessionStorage.setItem("autohub_lead_loc", e.target.value); } catch {}
                }}
              />
            </div>
          </div>

          {/* Quality Website Filter Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface/50 border border-white/5 hover:border-brand/30 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent-green/10 border border-accent-green/20 flex items-center justify-center text-accent-green shrink-0">
                <Globe size={16} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-fg">Quality Leads Filter (Website Required)</span>
                  <span className="badge border-accent-green/30 text-accent-green text-[10px] px-1.5 py-0.2">
                    High Quality Leads
                  </span>
                </div>
                <p className="text-[11px] text-muted">
                  Extracts only businesses with genuine active websites to guarantee high-quality leads with valid emails &amp; contact channels.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span
                className={`text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-full border transition-all ${
                  onlyWithWebsite
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {onlyWithWebsite ? "ACTIVE (ON)" : "ALL (OFF)"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={onlyWithWebsite}
                onClick={() => {
                  const nextVal = !onlyWithWebsite;
                  setOnlyWithWebsite(nextVal);
                  try { sessionStorage.setItem("autohub_lead_only_web", String(nextVal)); } catch {}
                }}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                  onlyWithWebsite
                    ? "bg-emerald-500 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.45)]"
                    : "bg-slate-800 border-slate-600"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    onlyWithWebsite ? "translate-x-6.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-12 items-end pt-1">
            <div className="sm:col-span-3">
              <label className="label font-medium text-slate-300">Max Leads</label>
              <input
                type="number"
                className="input h-12 text-sm"
                min={5}
                max={500}
                value={maxResults}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMaxResults(val);
                  try { sessionStorage.setItem("autohub_lead_max", String(val)); } catch {}
                }}
              />
            </div>

            <div className="sm:col-span-4">
              <label className="label font-medium text-slate-300">Enrichment Mode</label>
              <select
                className="input h-12 text-sm"
                value={findEmails ? "yes" : "no"}
                onChange={(e) => {
                  const nextBool = e.target.value === "yes";
                  setFindEmails(nextBool);
                  try { sessionStorage.setItem("autohub_lead_emails", String(nextBool)); } catch {}
                }}
              >
                <option value="yes" className="bg-surface">
                  Deep Web Scraping (18 Fields)
                </option>
                <option value="no" className="bg-surface">
                  Basic Map Scraper
                </option>
              </select>
            </div>

            <div className="sm:col-span-5 flex items-center gap-2">
              <button
                type="button"
                id="extract-leads-button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearch(e);
                }}
                disabled={loading}
                className="flex-1 h-12 px-6 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:via-indigo-500 hover:to-violet-500 shadow-[0_0_28px_rgba(79,70,229,0.6)] hover:shadow-[0_0_38px_rgba(99,102,241,0.85)] border border-indigo-400/50 hover:border-indigo-300 flex items-center justify-center gap-2.5 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {loading ? (
                  <>
                    <Search size={19} className="animate-spin text-cyan-300" />
                    <span className="tracking-wide">Extracting Leads...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={19} className="text-amber-300 animate-pulse" />
                    <span className="tracking-wide">Extract Leads</span>
                  </>
                )}
              </button>
              {loading && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="h-12 px-4 rounded-xl text-xs font-semibold bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                  title="Cancel active extraction"
                >
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </div>
        </form>

        {statusMessage && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-3 text-xs text-brand-2 flex items-center justify-between">
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Results Table & Export Strip */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-fg">
                Extracted Leads Results ({filteredLeads.length}{requiredFields.length > 0 ? ` / ${leads.length}` : ""})
              </h2>
              {requiredFields.length > 0 && (
                <span className="badge border-amber-500/40 text-amber-300 text-[10px] px-2 py-0.5">
                  Filtered ({requiredFields.length} active)
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-1">
              Genuine scraped data from places &amp; websites. All 18 fields are organized below. Click the eye icon for full details.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleDeepWebScrape}
              disabled={leads.length === 0 || scraping}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500 hover:text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Crawl all websites to scrape genuine emails, phones & social media accounts"
            >
              <Globe size={14} className={scraping ? "animate-spin" : ""} />
              {scraping ? "Web Scraping..." : "Web Scrape All Sites"}
            </button>

            {scraping && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/40 hover:bg-rose-600 hover:text-white shadow-sm transition-all flex items-center gap-1"
                title="Cancel web scraping"
              >
                <X size={14} /> Cancel
              </button>
            )}

            <button
              onClick={handleCopyTsv}
              disabled={filteredLeads.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-medium bg-surface-2 text-fg border border-border/80 hover:bg-surface-3 hover:border-fg/30 shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Copy filtered leads (all 18 columns) to clipboard"
            >
              {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
              {copied ? "Copied TSV!" : "Copy TSV"}
            </button>

            <button
              onClick={handleDownloadCsv}
              disabled={filteredLeads.length === 0}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/40 hover:bg-violet-600 hover:text-white shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              title="Download CSV spreadsheet of filtered leads"
            >
              <Download size={14} /> Download CSV
            </button>

            <button
              onClick={handleExportGoogleSheets}
              disabled={filteredLeads.length === 0 || exportingSheets}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white hover:border-emerald-400 shadow-md shadow-emerald-950/40 transition-all flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-95"
              title="Export filtered leads directly to Google Sheets"
            >
              {exportingSheets ? (
                <FileSpreadsheet size={15} className="animate-spin text-emerald-400" />
              ) : (
                <GoogleSheetsIcon className="w-4 h-4 shrink-0" />
              )}
              {exportingSheets ? "Exporting to Sheets..." : "Export to Google Sheet"}
            </button>

            {/* 18-Field Data Presence Filter Dropdown */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-sm ${
                  requiredFields.length > 0
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30"
                    : "bg-surface-2 text-fg border-border/80 hover:bg-surface-3 hover:border-brand/40"
                }`}
                title="Filter leads: Tick fields to only show leads that have that data"
              >
                <Filter size={14} className={requiredFields.length > 0 ? "text-amber-400" : "text-brand"} />
                <span>Filter Leads</span>
                {requiredFields.length > 0 ? (
                  <span className="badge px-1.5 py-0.2 text-[10px] bg-amber-500/30 text-amber-200 border border-amber-500/40 font-mono">
                    {filteredLeads.length}/{leads.length}
                  </span>
                ) : (
                  <span className="badge px-1.5 py-0.2 text-[10px] bg-brand/20 text-brand border border-brand/30 font-mono">
                    All
                  </span>
                )}
                <ChevronDown size={13} className={`transition-transform duration-200 text-muted ${showFilterDropdown ? "rotate-180" : ""}`} />
              </button>

              {showFilterDropdown && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl bg-surface-1 border border-border shadow-2xl p-4 space-y-3 backdrop-blur-md animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <div>
                      <span className="font-bold text-xs text-fg">Filter Leads by Available Data</span>
                      <p className="text-[10px] text-muted">Tick boxes to only show leads possessing this verified info.</p>
                    </div>
                    {requiredFields.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setRequiredFields([])}
                        className="text-[10px] text-accent-pink hover:underline font-bold px-1.5 py-0.5 rounded hover:bg-accent-pink/10 transition-colors"
                      >
                        Reset All
                      </button>
                    )}
                  </div>

                  {/* Match Condition Toggle */}
                  <div className="flex items-center justify-between bg-surface-2/60 p-1.5 rounded-xl border border-border/50 text-[11px]">
                    <span className="text-muted text-[10px] pl-1 font-medium">Match Condition:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFilterMatchMode("all")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                          filterMatchMode === "all" ? "bg-brand text-white shadow-xs" : "text-muted hover:text-fg"
                        }`}
                        title="Leads must have ALL ticked fields"
                      >
                        Match All (AND)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMatchMode("any")}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                          filterMatchMode === "any" ? "bg-brand text-white shadow-xs" : "text-muted hover:text-fg"
                        }`}
                        title="Leads must have AT LEAST ONE ticked field"
                      >
                        Match Any (OR)
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-xs">
                    {/* Company Level */}
                    <div>
                      <div className="text-[11px] font-semibold text-brand uppercase tracking-wider mb-1.5">
                        Company Level Data (1 - 10)
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ALL_18_FIELDS.filter((f) => f.category === "Company (1-10)").map((f) => {
                          const count = leads.filter((l) => hasLeadFieldValue(l, f.id)).length;
                          const isChecked = requiredFields.includes(f.id);
                          return (
                            <label
                              key={f.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                                isChecked ? "bg-brand/15 border border-brand/30" : "hover:bg-surface-2"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setRequiredFields((prev) =>
                                      prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                    );
                                  }}
                                  className="rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
                                />
                                <span className={`text-[11px] truncate ${isChecked ? "text-brand font-semibold" : "text-fg"}`}>
                                  {f.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted shrink-0 pl-1">
                                {count}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Founder Level */}
                    <div className="pt-2 border-t border-border/40">
                      <div className="text-[11px] font-semibold text-accent-pink uppercase tracking-wider mb-1.5">
                        Founder Level Data (11 - 14)
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ALL_18_FIELDS.filter((f) => f.category === "Founder (11-14)").map((f) => {
                          const count = leads.filter((l) => hasLeadFieldValue(l, f.id)).length;
                          const isChecked = requiredFields.includes(f.id);
                          return (
                            <label
                              key={f.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                                isChecked ? "bg-accent-pink/15 border border-accent-pink/30" : "hover:bg-surface-2"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setRequiredFields((prev) =>
                                      prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                    );
                                  }}
                                  className="rounded border-border text-accent-pink focus:ring-accent-pink accent-pink-500 cursor-pointer"
                                />
                                <span className={`text-[11px] truncate ${isChecked ? "text-accent-pink font-semibold" : "text-fg"}`}>
                                  {f.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted shrink-0 pl-1">
                                {count}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    {/* Manager Level */}
                    <div className="pt-2 border-t border-border/40">
                      <div className="text-[11px] font-semibold text-brand-2 uppercase tracking-wider mb-1.5">
                        Manager Level Data (15 - 18)
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {ALL_18_FIELDS.filter((f) => f.category === "Manager (15-18)").map((f) => {
                          const count = leads.filter((l) => hasLeadFieldValue(l, f.id)).length;
                          const isChecked = requiredFields.includes(f.id);
                          return (
                            <label
                              key={f.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg cursor-pointer select-none transition-colors ${
                                isChecked ? "bg-brand-2/15 border border-brand-2/30" : "hover:bg-surface-2"
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setRequiredFields((prev) =>
                                      prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                                    );
                                  }}
                                  className="rounded border-border text-brand-2 focus:ring-brand-2 accent-indigo-500 cursor-pointer"
                                />
                                <span className={`text-[11px] truncate ${isChecked ? "text-brand-2 font-semibold" : "text-fg"}`}>
                                  {f.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted shrink-0 pl-1">
                                {count}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active Filter Chips */}
        {requiredFields.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap text-xs pt-1 border-t border-border/50">
            <span className="text-muted text-[11px] font-medium">Filtered by:</span>
            {requiredFields.map((fId) => {
              const cfg = ALL_18_FIELDS.find((f) => f.id === fId);
              return (
                <span
                  key={fId}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-medium"
                >
                  <span>Has {cfg?.label}</span>
                  <button
                    type="button"
                    onClick={() => setRequiredFields((prev) => prev.filter((id) => id !== fId))}
                    className="hover:text-white cursor-pointer"
                    title="Remove filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              onClick={() => setRequiredFields([])}
              className="text-[11px] text-muted hover:text-fg underline ml-1 cursor-pointer"
            >
              Reset Filters
            </button>
            <span className="text-muted text-[11px] ml-auto font-mono">
              Showing {filteredLeads.length} of {leads.length} leads
            </span>
          </div>
        )}

        {exportedSheetUrl && (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={18} className="shrink-0 text-emerald-400" />
              <span>
                Google Spreadsheet is live in your Google Drive! All {filteredLeads.length} leads populated with verified 18 columns.
              </span>
            </div>
            <a
              href={exportedSheetUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary text-xs bg-emerald-600 hover:bg-emerald-500 border-none inline-flex items-center gap-1 text-white"
            >
              Open in Google Sheets <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Organized Leads Container - NO horizontal slider, completely fits the page cleanly */}
        <div className="w-full rounded-2xl border border-white/5 bg-surface/30 overflow-hidden">
          <div className="w-full">
            {/* Desktop Header */}
            <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-surface-2/70 border-b border-border/80 text-muted uppercase text-[11px] font-semibold tracking-wider">
              <div className="col-span-3">Company &amp; Address</div>
              <div className="col-span-2">Company Contacts</div>
              <div className="col-span-2">Founder Level</div>
              <div className="col-span-2">Manager Level</div>
              <div className="col-span-2">Social Profiles</div>
              <div className="col-span-1 text-center">Action</div>
            </div>

            {/* Leads Rows */}
            <div className="divide-y divide-border/60">
              {filteredLeads.length === 0 ? (
                <div className="py-16 text-center text-muted text-xs">
                  {leads.length === 0
                    ? loading
                      ? "Extracting leads from places and searching genuine data..."
                      : "No leads gathered yet. Run search above to extract genuine business records."
                    : "No leads match the active filters. Try clearing some filters."}
                </div>
              ) : (
                filteredLeads.map((l, i) => {
                  const companyEmails = l.company_emails || [];
                  const companyPhones = l.company_phones || [];
                  const founderEmails = l.founder_emails || [];
                  const founderPhones = l.founder_phones || [];
                  const founderSocials = l.founder_socials || [];
                  const managerEmails = l.manager_emails || [];
                  const managerPhones = l.manager_phones || [];
                  const managerSocials = l.manager_socials || [];

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 hover:bg-surface-2/60 transition-colors text-xs items-start"
                    >
                      {/* 1. Company & Location (col-span-3) */}
                      <div className="lg:col-span-3 space-y-1.5 min-w-0">
                        <div className="font-bold text-fg text-sm break-words" title={l.company_name}>
                          {l.company_name}
                        </div>
                        <div
                          className="text-[11px] text-muted flex items-start gap-1.5 leading-snug break-words"
                          title={l.company_location || l.address || l.city || "Not Available"}
                        >
                          <MapPin size={12} className="shrink-0 text-brand mt-0.5" />
                          <span>{l.company_location || l.address || l.city || "Not Available"}</span>
                        </div>
                        {l.company_website || l.website ? (
                          <div className="pt-0.5">
                            <a
                              href={l.company_website || l.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-2 hover:text-brand inline-flex items-center gap-1 font-mono text-[11px] underline underline-offset-2 break-all"
                              title={l.company_website || l.website}
                            >
                              <span className="truncate max-w-[200px]">
                                {(l.company_website || l.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              </span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-muted text-[11px] italic block">Website: Not Available</span>
                        )}
                      </div>

                      {/* 2. Company Contacts (col-span-2) */}
                      <div className="lg:col-span-2 space-y-2 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Company Contacts:</div>
                        <div className="space-y-1">
                          {companyEmails.length > 0 ? (
                            companyEmails.map((em, idx) => (
                              <div
                                key={idx}
                                className="badge border-border text-fg font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md break-all"
                                title={`Company Email: ${em}`}
                              >
                                <Mail size={10} className="shrink-0 text-brand" />
                                <span className="truncate">{em}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted text-[10px] italic block">Email: Not Available</span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {companyPhones.length > 0 ? (
                            companyPhones.map((ph, idx) => (
                              <div
                                key={idx}
                                className="badge border-border text-muted font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md bg-surface-2/50"
                                title={`Company Phone: ${ph}`}
                              >
                                <Phone size={10} className="shrink-0 text-muted" />
                                <span>{ph}</span>
                              </div>
                            ))
                          ) : (
                            <span className="text-muted text-[10px] italic block">Phone: Not Available</span>
                          )}
                        </div>
                      </div>

                      {/* 3. Founder Level (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Founder Level:</div>
                        <div className="text-xs font-semibold text-accent-pink flex items-center gap-1.5 truncate">
                          <User size={12} className="shrink-0" />
                          <span className="truncate">{l.founder_name || <span className="text-muted font-normal italic">Not Available</span>}</span>
                        </div>
                        <div className="space-y-1">
                          {founderEmails.length > 0 ? (
                            founderEmails.map((em, idx) => (
                              <div
                                key={idx}
                                className="badge border-accent-pink/40 text-accent-pink font-mono text-[10px] px-2 py-0.5 rounded-md break-all"
                                title={`Founder Email: ${em}`}
                              >
                                <span className="truncate">{em}</span>
                              </div>
                            ))
                          ) : null}
                          {founderPhones.length > 0 ? (
                            founderPhones.map((ph, idx) => (
                              <div
                                key={idx}
                                className="badge border-border text-muted font-mono text-[10px] px-2 py-0.5 rounded-md"
                                title={`Founder Phone: ${ph}`}
                              >
                                {ph}
                              </div>
                            ))
                          ) : null}
                          {founderSocials.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {founderSocials.map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-accent-pink text-[9px] hover:underline"
                                >
                                  Social {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {!l.founder_name && founderEmails.length === 0 && founderPhones.length === 0 && (
                            <span className="text-muted text-[10px] italic block">Data Not Available</span>
                          )}
                        </div>
                      </div>

                      {/* 4. Manager Level (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Manager Level:</div>
                        <div className="text-xs font-semibold text-brand-2 flex items-center gap-1.5 truncate">
                          <Briefcase size={12} className="shrink-0" />
                          <span className="truncate">{l.manager_name || <span className="text-muted font-normal italic">Not Available</span>}</span>
                        </div>
                        <div className="space-y-1">
                          {managerEmails.length > 0 ? (
                            managerEmails.map((em, idx) => (
                              <div
                                key={idx}
                                className="badge border-brand-2/40 text-brand-2 font-mono text-[10px] px-2 py-0.5 rounded-md break-all"
                                title={`Manager Email: ${em}`}
                              >
                                <span className="truncate">{em}</span>
                              </div>
                            ))
                          ) : null}
                          {managerPhones.length > 0 ? (
                            managerPhones.map((ph, idx) => (
                              <div
                                key={idx}
                                className="badge border-border text-muted font-mono text-[10px] px-2 py-0.5 rounded-md"
                                title={`Manager Phone: ${ph}`}
                              >
                                {ph}
                              </div>
                            ))
                          ) : null}
                          {managerSocials.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {managerSocials.map((s, idx) => (
                                <a
                                  key={idx}
                                  href={s}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-brand-2 text-[9px] hover:underline"
                                >
                                  Social {idx + 1}
                                </a>
                              ))}
                            </div>
                          ) : null}
                          {!l.manager_name && managerEmails.length === 0 && managerPhones.length === 0 && (
                            <span className="text-muted text-[10px] italic block">Data Not Available</span>
                          )}
                        </div>
                      </div>

                      {/* 5. Social Media (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Social Profiles:</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {l.company_facebook && (
                            <a
                              href={l.company_facebook}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-bold hover:bg-blue-500 hover:text-white transition-all shadow-xs"
                              title="Facebook Page"
                            >
                              FB
                            </a>
                          )}
                          {l.company_instagram && (
                            <a
                              href={l.company_instagram}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-pink-500/15 text-pink-400 border border-pink-500/30 text-[10px] font-bold hover:bg-pink-500 hover:text-white transition-all shadow-xs"
                              title="Instagram Profile"
                            >
                              IG
                            </a>
                          )}
                          {l.company_linkedin && (
                            <a
                              href={l.company_linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold hover:bg-sky-500 hover:text-white transition-all shadow-xs"
                              title="LinkedIn Company"
                            >
                              LI
                            </a>
                          )}
                          {l.company_tiktok && (
                            <a
                              href={l.company_tiktok}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-bold hover:bg-purple-500 hover:text-white transition-all shadow-xs"
                              title="TikTok Channel"
                            >
                              TT
                            </a>
                          )}
                          {l.company_youtube && (
                            <a
                              href={l.company_youtube}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-red-500/15 text-red-400 border border-red-500/30 text-[10px] font-bold hover:bg-red-500 hover:text-white transition-all shadow-xs"
                              title="YouTube Channel"
                            >
                              YT
                            </a>
                          )}
                          {!l.company_facebook &&
                            !l.company_instagram &&
                            !l.company_linkedin &&
                            !l.company_tiktok &&
                            !l.company_youtube && (
                              <span className="text-muted text-[10px] italic">Not Available</span>
                            )}
                        </div>
                      </div>

                      {/* 6. Action Button (col-span-1) */}
                      <div className="lg:col-span-1 flex lg:justify-center items-center pt-1 lg:pt-0">
                        <button
                          onClick={() => setSelectedLead(l)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-2 border border-border/80 text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-sm cursor-pointer"
                          title="View Full Lead Details (All 18 Fields)"
                          aria-label="View Full Lead Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Complete 18-Attribute Lead Inspector Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass max-w-2xl w-full rounded-3xl p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge border-brand/40 text-brand text-[10px]">18 Field Lead Inspector</span>
                <h3 className="text-xl font-bold text-fg mt-1">{selectedLead.company_name}</h3>
                <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                  <MapPin size={12} className="text-brand" /> {selectedLead.company_location || selectedLead.city || "Not Available"}
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="btn btn-ghost p-2 rounded-xl text-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Section 1: Company Profile (10 Attributes) */}
            <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-2/40 p-4">
              <h4 className="text-xs font-semibold text-fg uppercase tracking-wider flex items-center gap-2">
                <Building2 size={14} className="text-brand" /> Company Level Data (1 - 10)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">1. Company Name</span>
                  <span className="font-semibold text-fg">{selectedLead.company_name}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">4. Website</span>
                  {selectedLead.company_website || selectedLead.website ? (
                    <a
                      href={selectedLead.company_website || selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-2 hover:underline inline-flex items-center gap-1"
                    >
                      {selectedLead.company_website || selectedLead.website} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-muted italic">Not Available</span>
                  )}
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    2. Company Emails ({selectedLead.company_emails?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px]">
                    {selectedLead.company_emails?.length
                      ? selectedLead.company_emails.map((e, idx) => <div key={idx}>• {e}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    3. Company Phones ({selectedLead.company_phones?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px]">
                    {selectedLead.company_phones?.length
                      ? selectedLead.company_phones.map((p, idx) => <div key={idx}>• {p}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">10. Full Address & Location</span>
                  <span className="text-fg font-medium">{selectedLead.company_location || selectedLead.address || selectedLead.city || "Not Available"}</span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">5-9. Social Media Profiles</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedLead.company_facebook && (
                      <a href={selectedLead.company_facebook} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">
                        Facebook
                      </a>
                    )}
                    {selectedLead.company_instagram && (
                      <a href={selectedLead.company_instagram} target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">
                        Instagram
                      </a>
                    )}
                    {selectedLead.company_linkedin && (
                      <a href={selectedLead.company_linkedin} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                        LinkedIn
                      </a>
                    )}
                    {selectedLead.company_tiktok && (
                      <a href={selectedLead.company_tiktok} target="_blank" rel="noreferrer" className="text-purple-400 hover:underline">
                        TikTok
                      </a>
                    )}
                    {selectedLead.company_youtube && (
                      <a href={selectedLead.company_youtube} target="_blank" rel="noreferrer" className="text-red-400 hover:underline">
                        YouTube
                      </a>
                    )}
                    {!selectedLead.company_facebook &&
                      !selectedLead.company_instagram &&
                      !selectedLead.company_linkedin &&
                      !selectedLead.company_tiktok &&
                      !selectedLead.company_youtube && (
                        <span className="text-muted italic">Not Available</span>
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Founder Details (4 Attributes) */}
            <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-2/40 p-4">
              <h4 className="text-xs font-semibold text-accent-pink uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> Founder Level Data (11 - 14)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">11. Founder Name</span>
                  <span className="font-semibold text-fg">
                    {selectedLead.founder_name || <span className="text-muted italic font-normal">Not Available</span>}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    13. Founder Emails ({selectedLead.founder_emails?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px] text-accent-pink">
                    {selectedLead.founder_emails?.length
                      ? selectedLead.founder_emails.map((e, idx) => <div key={idx}>• {e}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    12. Founder Phones ({selectedLead.founder_phones?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px]">
                    {selectedLead.founder_phones?.length
                      ? selectedLead.founder_phones.map((p, idx) => <div key={idx}>• {p}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">14. Founder Socials</span>
                  <div className="space-y-0.5 mt-0.5 text-[11px]">
                    {selectedLead.founder_socials?.length
                      ? selectedLead.founder_socials.map((s, idx) => (
                          <div key={idx}>
                            <a href={s} target="_blank" rel="noreferrer" className="text-brand-2 hover:underline inline-flex items-center gap-1">
                              {s} <ExternalLink size={9} />
                            </a>
                          </div>
                        ))
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: Manager Details (4 Attributes) */}
            <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-2/40 p-4">
              <h4 className="text-xs font-semibold text-brand-2 uppercase tracking-wider flex items-center gap-2">
                <Briefcase size={14} /> Manager Level Data (15 - 18)
              </h4>
              <div className="grid gap-3 sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted block text-[11px]">15. Manager Name</span>
                  <span className="font-semibold text-fg">
                    {selectedLead.manager_name || <span className="text-muted italic font-normal">Not Available</span>}
                  </span>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    16. Manager Emails ({selectedLead.manager_emails?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px] text-brand-2">
                    {selectedLead.manager_emails?.length
                      ? selectedLead.manager_emails.map((e, idx) => <div key={idx}>• {e}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">
                    17. Manager Phones ({selectedLead.manager_phones?.length || 0})
                  </span>
                  <div className="space-y-0.5 mt-0.5 font-mono text-[11px]">
                    {selectedLead.manager_phones?.length
                      ? selectedLead.manager_phones.map((p, idx) => <div key={idx}>• {p}</div>)
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
                <div>
                  <span className="text-muted block text-[11px]">18. Manager Socials</span>
                  <div className="space-y-0.5 mt-0.5 text-[11px]">
                    {selectedLead.manager_socials?.length
                      ? selectedLead.manager_socials.map((s, idx) => (
                          <div key={idx}>
                            <a href={s} target="_blank" rel="noreferrer" className="text-brand-2 hover:underline inline-flex items-center gap-1">
                              {s} <ExternalLink size={9} />
                            </a>
                          </div>
                        ))
                      : <span className="text-muted italic">Not Available</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setSelectedLead(null)} className="btn btn-primary text-xs">
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Key Connect Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass max-w-lg w-full rounded-3xl p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge border-brand/40 text-brand text-[10px]">Google Cloud Places</span>
                <h3 className="text-lg font-bold text-fg mt-1">Connect Google Places API Key</h3>
                <p className="text-xs text-muted mt-0.5">
                  Enter your Google Cloud API key with <strong>Places API (New)</strong> enabled.
                </p>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="btn btn-ghost p-1.5 rounded-xl text-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConnectKey} className="space-y-4">
              <div>
                <label className="label text-xs">Google API Key</label>
                <input
                  type="password"
                  required
                  placeholder="AIzaSy..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="input font-mono text-xs"
                  autoComplete="off"
                />
                <span className="text-[11px] text-muted mt-1 block">
                  Keys are validated against Google Places API and securely encrypted using AES-256 before saving.
                </span>
              </div>

              {keyError && (
                <div className="p-3 rounded-xl border border-accent-pink/40 bg-accent-pink/10 text-accent-pink text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{keyError}</span>
                </div>
              )}

              {keySuccess && (
                <div className="p-3 rounded-xl border border-accent-green/40 bg-accent-green/10 text-accent-green text-xs flex items-center gap-2">
                  <Check size={14} className="shrink-0" />
                  <span>{keySuccess}</span>
                </div>
              )}

              <div className="p-3.5 rounded-2xl bg-surface-2/60 border border-border text-[11px] text-muted space-y-1.5">
                <div className="font-semibold text-fg">How to get a free Google Places Key:</div>
                <ol className="list-decimal list-inside space-y-1 text-[11px]">
                  <li>Go to Google Cloud Console (console.cloud.google.com)</li>
                  <li>In <strong>APIs & Services</strong>, enable <strong>Places API (New)</strong></li>
                  <li>Go to <strong>Credentials</strong> → <strong>Create Credentials</strong> → <strong>API Key</strong></li>
                  <li>Paste your key above and click <strong>Verify & Connect</strong></li>
                </ol>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="btn btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={keyLoading || !keyInput.trim()}
                  className="btn btn-primary text-xs"
                >
                  {keyLoading ? "Verifying with Google..." : "Verify & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Google Sheets Direct OAuth Connect Modal */}
      {showGoogleAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="glass max-w-lg w-full rounded-3xl p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <GoogleSheetsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-fg">Direct Google Sheets Sync</h3>
                  <p className="text-xs text-muted">Populate leads directly into your Google Drive</p>
                </div>
              </div>
              <button
                onClick={() => setShowGoogleAuthModal(false)}
                className="btn btn-ghost p-1.5 rounded-xl text-muted hover:text-fg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-2/60 border border-border text-xs text-slate-300 space-y-2">
              <p className="leading-relaxed">
                Connect your Google Account to create spreadsheets directly inside your Google Drive with all <strong className="text-white">18 columns</strong> automatically populated — zero clipboard copying and zero manual pasting required!
              </p>
            </div>

            {googleAuthStatus?.clientConfigured ? (
              <div className="space-y-3 pt-2">
                <a
                  href="/api/v1/auth/google/start?returnTo=/app/leads/google_maps"
                  className="w-full h-11 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <GoogleSheetsIcon className="w-4 h-4" />
                  <span>Sign In with Google to Export Directly</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSaveGoogleConfig} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Google OAuth Client ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                    value={googleClientIdInput}
                    onChange={(e) => setGoogleClientIdInput(e.target.value)}
                    className="input font-mono text-xs h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Google OAuth Client Secret</label>
                  <input
                    type="password"
                    required
                    placeholder="GOCSPX-..."
                    value={googleClientSecretInput}
                    onChange={(e) => setGoogleClientSecretInput(e.target.value)}
                    className="input font-mono text-xs h-9"
                  />
                </div>
                <p className="text-[10px] text-muted">
                  From Google Cloud Console → APIs &amp; Services → Credentials → OAuth 2.0 Client ID.
                </p>
                {googleConfigError && (
                  <div className="p-2.5 rounded-xl border border-accent-pink/40 bg-accent-pink/10 text-accent-pink text-xs">
                    {googleConfigError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={googleConfigLoading || !googleClientIdInput || !googleClientSecretInput}
                  className="w-full h-10 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {googleConfigLoading ? "Saving..." : "Save & Authorize with Google"}
                </button>
              </form>
            )}

            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={async () => {
                  setShowGoogleAuthModal(false);
                  await copyFormattedLeadsToClipboard();
                  window.open("https://sheets.new", "_blank");
                  setStatusMessage(`All ${leads.length} leads copied to clipboard. Press Ctrl+V in your newly opened sheet.`);
                }}
                className="text-muted hover:text-fg text-[11px] underline"
              >
                Or open blank sheet in new tab
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleAuthModal(false)}
                className="btn btn-ghost text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
