"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
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
  AlertTriangle,
  Trash2,
  FileSpreadsheet,
  Filter,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import {
  STANDARD_EXPORT_HEADERS,
  generateCsvContent,
  generateTsvContent,
  generateHtmlTableContent,
  formatLeadRowForExport,
} from "@/server/providers/leads/export-helpers";
import { parseMultiLineSearch } from "@/server/providers/leads/apify/line-parser";

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
  company_twitter?: string;
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

  // Meta Ads / LinkedIn / Source Intelligence
  ad_count?: number;
  ad_snippet?: string;
  ad_library_url?: string;
  platforms?: string[];
  start_date?: string;
  decision_makers?: Array<{
    name: string;
    title: string;
    profileUrl: string;
    isVerifiedRole?: boolean;
  }>;
  company_size?: string;
  industry?: string;
  extra?: Record<string, any>;
}

export const LINKEDIN_PRESET_TITLES = [
  "CEO",
  "Founder",
  "Owner",
  "Managing Director",
  "VP Sales",
  "Marketing Director",
  "CTO",
  "COO",
];

export const META_COUNTRIES = [
  { code: "US", name: "United States (US)" },
  { code: "GB", name: "United Kingdom (GB)" },
  { code: "CA", name: "Canada (CA)" },
  { code: "AU", name: "Australia (AU)" },
  { code: "BD", name: "Bangladesh (BD)" },
  { code: "DE", name: "Germany (DE)" },
  { code: "FR", name: "France (FR)" },
  { code: "IN", name: "India (IN)" },
  { code: "AE", name: "United Arab Emirates (AE)" },
  { code: "SG", name: "Singapore (SG)" },
  { code: "NL", name: "Netherlands (NL)" },
  { code: "ES", name: "Spain (ES)" },
  { code: "IT", name: "Italy (IT)" },
  { code: "BR", name: "Brazil (BR)" },
  { code: "MX", name: "Mexico (MX)" },
  { code: "NZ", name: "New Zealand (NZ)" },
  { code: "IE", name: "Ireland (IE)" },
  { code: "ZA", name: "South Africa (ZA)" },
  { code: "PH", name: "Philippines (PH)" },
  { code: "MY", name: "Malaysia (MY)" },
  { code: "PK", name: "Pakistan (PK)" },
  { code: "NG", name: "Nigeria (NG)" },
  { code: "SA", name: "Saudi Arabia (SA)" },
];

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

export function getLeadUniqueKey(l: ComprehensiveLead, index: number): string {
  return (
    l.extra?.dedupe_key ||
    `${l.company_name || "lead"}::${l.company_website || l.website || l.company_location || l.address || l.city || index}`
  );
}

export function LiveLeadsFinder({
  source = "google_maps",
  isConfigured = true,
}: {
  source?: string;
  isConfigured?: boolean;
}) {
  const isGoogleMaps = source === "google_maps";
  const isMeta = source === "meta_ads";
  const isLinkedIn = source === "linkedin";

  // Google Maps Multi-Line Search (format: niche, location)
  const [gmapsMultiLine, setGmapsMultiLine] = useState(
    "restaurant, TX\nGYM, NY\nDENTAL CLINIC, CA\nCOFFEE SHOP, FL\nBARBER SHOP, GA"
  );

  const parsedGmaps = useMemo(() => {
    return parseMultiLineSearch(gmapsMultiLine, 5);
  }, [gmapsMultiLine]);

  // Seniority levels & Company Size for B2B Leads
  const [selectedSeniority, setSelectedSeniority] = useState<string[]>([]);
  const [companySize, setCompanySize] = useState<string>("");
  const [requireEmailOnly, setRequireEmailOnly] = useState<boolean>(true);

  // Form input states - empty by default (Tasks 3 & 4)
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [maxResultsStr, setMaxResultsStr] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    keyword?: string;
    location?: string;
    maxResults?: string;
  }>({});
  const maxResults = parseInt(maxResultsStr.trim(), 10) || 25;

  // Dynamic admin-configured lead limits
  const [adminLimits, setAdminLimits] = useState<{
    google_maps: number;
    meta_ads: number;
    b2b_leads: number;
    ceiling: number;
  }>({
    google_maps: 100,
    meta_ads: 200,
    b2b_leads: 100,
    ceiling: 1000,
  });

  useEffect(() => {
    fetch("/api/v1/leads/limits")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data?.limits) {
          setAdminLimits(data.data.limits);
        }
      })
      .catch(() => {});
  }, []);

  const currentMaxLimit = useMemo(() => {
    if (isGoogleMaps) return adminLimits.google_maps || 100;
    if (isMeta) return adminLimits.meta_ads || 200;
    return adminLimits.b2b_leads || 100;
  }, [isGoogleMaps, isMeta, adminLimits]);

  const [metaCountry, setMetaCountry] = useState("US");
  const [metaCity, setMetaCity] = useState("");
  const [metaAdStatus, setMetaAdStatus] = useState<"active" | "all">("active");
  const [selectedTitles, setSelectedTitles] = useState<string[]>(["CEO", "Founder", "Managing Director"]);
  const [customTitleInput, setCustomTitleInput] = useState("");
  const [findDecisionMakers, setFindDecisionMakers] = useState(true);
  const [maxDecisionMakers, setMaxDecisionMakers] = useState(3);
  const [linkedinCountry, setLinkedinCountry] = useState("US");
  const [linkedinState, setLinkedinState] = useState("");
  const [linkedinCity, setLinkedinCity] = useState("");
  const [linkedinIndustry, setLinkedinIndustry] = useState("");
  const [requirePhoneOnly, setRequirePhoneOnly] = useState(false);
  const [findEmails, setFindEmails] = useState(true);

  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [leads, setLeads] = useState<ComprehensiveLead[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Row selection and Quick-Search state
  const [selectedLeadKeys, setSelectedLeadKeys] = useState<Set<string>>(new Set());
  const [quickSearchQuery, setQuickSearchQuery] = useState("");

  // Selected lead for full 18-attribute inspector modal
  const [selectedLead, setSelectedLead] = useState<ComprehensiveLead | null>(null);

  // 18-Field Data Presence Filter (filters which leads are shown based on ticked required fields)
  const [requiredFields, setRequiredFields] = useState<LeadFieldId[]>([]);
  const [filterMatchMode, setFilterMatchMode] = useState<"all" | "any">("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);

  // Meta Ads specific filters
  const [metaFilterStatus, setMetaFilterStatus] = useState<"all" | "active">("all");
  const [metaFilterMinDays, setMetaFilterMinDays] = useState<number>(0);
  const [metaFilterMinAds, setMetaFilterMinAds] = useState<number>(0);
  const [metaFilterPlatform, setMetaFilterPlatform] = useState<string>("all");
  const [metaFilterHasWebsite, setMetaFilterHasWebsite] = useState<"all" | "yes" | "no">("all");

  // Meta Ads Drawer Raw JSON viewer state
  const [showRawJson, setShowRawJson] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // LinkedIn B2B specific filters
  const [linkedinFilterSeniority, setLinkedinFilterSeniority] = useState<string>("all");
  const [linkedinFilterCompanySize, setLinkedinFilterCompanySize] = useState<string>("all");
  const [linkedinFilterHasEmail, setLinkedinFilterHasEmail] = useState<"all" | "yes" | "no">("all");
  const [linkedinFilterHasPhone, setLinkedinFilterHasPhone] = useState<"all" | "yes" | "no">("all");
  const [groupByCompany, setGroupByCompany] = useState<boolean>(false);

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

  // Clear any active polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  // Filter leads based on ticked required fields AND quick search query
  const filteredLeads = useMemo(() => {
    let result = leads;

    if (isMeta) {
      if (metaFilterStatus === "active") {
        result = result.filter((l) => l.extra?.is_active !== false);
      }
      if (metaFilterMinDays > 0) {
        result = result.filter((l) => (l.extra?.running_days || 0) >= metaFilterMinDays);
      }
      if (metaFilterMinAds > 0) {
        result = result.filter((l) => (l.ad_count || l.extra?.ad_count || 1) >= metaFilterMinAds);
      }
      if (metaFilterPlatform !== "all") {
        result = result.filter((l) => {
          const plats = (l.platforms || l.extra?.platforms || []).map((p: string) => String(p).toLowerCase());
          return plats.includes(metaFilterPlatform.toLowerCase());
        });
      }
      if (metaFilterHasWebsite === "yes") {
        result = result.filter((l) => Boolean(l.company_website || l.website));
      } else if (metaFilterHasWebsite === "no") {
        result = result.filter((l) => !l.company_website && !l.website);
      }
    }

    if (isLinkedIn) {
      if (linkedinFilterSeniority !== "all") {
        result = result.filter((l) => {
          const sen = (l.extra?.seniority || "").toLowerCase();
          const dms = (l.decision_makers || l.extra?.decision_makers || []);
          const role = (l.extra?.job_title || dms[0]?.title || "").toLowerCase();
          if (linkedinFilterSeniority === "cxo") {
            return sen === "cxo" || role.includes("founder") || role.includes("ceo") || role.includes("owner") || role.includes("chief") || role.includes("president");
          } else if (linkedinFilterSeniority === "vp") {
            return sen === "vp" || role.includes("vp") || role.includes("vice president");
          } else if (linkedinFilterSeniority === "director") {
            return sen === "director" || role.includes("director") || role.includes("head");
          } else if (linkedinFilterSeniority === "manager") {
            return sen === "manager" || role.includes("manager") || role.includes("lead");
          } else if (linkedinFilterSeniority === "staff") {
            return sen === "staff" || (!role.includes("manager") && !role.includes("director") && !role.includes("vp") && !role.includes("chief") && !role.includes("founder"));
          }
          return sen === linkedinFilterSeniority;
        });
      }

      if (linkedinFilterCompanySize !== "all") {
        result = result.filter((l) => {
          const sz = (l.company_size || l.extra?.company_size || "").toLowerCase();
          return sz.includes(linkedinFilterCompanySize.toLowerCase());
        });
      }

      if (linkedinFilterHasEmail === "yes") {
        result = result.filter((l) => (l.company_emails?.length || 0) > 0 || (l.founder_emails?.length || 0) > 0 || Boolean(l.extra?.founder_email));
      } else if (linkedinFilterHasEmail === "no") {
        result = result.filter((l) => (l.company_emails?.length || 0) === 0 && (l.founder_emails?.length || 0) === 0 && !l.extra?.founder_email);
      }

      if (linkedinFilterHasPhone === "yes") {
        result = result.filter((l) => (l.company_phones?.length || 0) > 0 || (l.founder_phones?.length || 0) > 0 || (l.extra?.founder_phones?.length || 0) > 0);
      } else if (linkedinFilterHasPhone === "no") {
        result = result.filter((l) => (l.company_phones?.length || 0) === 0 && (l.founder_phones?.length || 0) === 0 && (l.extra?.founder_phones?.length || 0) === 0);
      }
    }

    if (requiredFields.length > 0) {
      result = result.filter((lead) => {
        if (filterMatchMode === "all") {
          return requiredFields.every((fId) => hasLeadFieldValue(lead, fId));
        } else {
          return requiredFields.some((fId) => hasLeadFieldValue(lead, fId));
        }
      });
    }

    const q = quickSearchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((lead) => {
        const name = (lead.company_name || "").toLowerCase();
        const loc = (lead.company_location || lead.address || lead.city || "").toLowerCase();
        const site = (lead.company_website || lead.website || "").toLowerCase();
        const emails = [
          ...(lead.company_emails || []),
          ...(lead.founder_emails || []),
          ...(lead.manager_emails || []),
        ]
          .join(" ")
          .toLowerCase();
        const phones = [
          ...(lead.company_phones || []),
          ...(lead.founder_phones || []),
          ...(lead.manager_phones || []),
        ]
          .join(" ")
          .toLowerCase();
        const founder = (lead.founder_name || "").toLowerCase();
        const manager = (lead.manager_name || "").toLowerCase();
        const dms = (lead.decision_makers || lead.extra?.decision_makers || [])
          .map((d: any) => `${d.name} ${d.title}`)
          .join(" ")
          .toLowerCase();
        const adSnippet = (lead.ad_snippet || lead.extra?.sample_ad_text || "").toLowerCase();
        const cta = (lead.extra?.cta_text || "").toLowerCase();
        const pageId = (lead.extra?.page_id || "").toLowerCase();
        const jobTitle = (lead.extra?.job_title || "").toLowerCase();

        return (
          name.includes(q) ||
          loc.includes(q) ||
          site.includes(q) ||
          emails.includes(q) ||
          phones.includes(q) ||
          founder.includes(q) ||
          manager.includes(q) ||
          dms.includes(q) ||
          adSnippet.includes(q) ||
          cta.includes(q) ||
          pageId.includes(q) ||
          jobTitle.includes(q)
        );
      });
    }

    return result;
  }, [
    leads,
    isMeta,
    isLinkedIn,
    metaFilterStatus,
    metaFilterMinDays,
    metaFilterMinAds,
    metaFilterPlatform,
    metaFilterHasWebsite,
    linkedinFilterSeniority,
    linkedinFilterCompanySize,
    linkedinFilterHasEmail,
    linkedinFilterHasPhone,
    requiredFields,
    filterMatchMode,
    quickSearchQuery,
  ]);

  // Grouped by company view for LinkedIn
  const groupedCompanies = useMemo(() => {
    if (!isLinkedIn || !groupByCompany) return [];
    const map = new Map<string, { companyName: string; leads: ComprehensiveLead[]; primaryLead: ComprehensiveLead }>();
    for (const l of filteredLeads) {
      const key = (l.company_name || "Unknown Company").trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          companyName: l.company_name || "Unknown Company",
          leads: [l],
          primaryLead: l,
        });
      } else {
        map.get(key)!.leads.push(l);
      }
    }
    return Array.from(map.values());
  }, [isLinkedIn, groupByCompany, filteredLeads]);

  // Selection helpers
  const allFilteredKeys = useMemo(
    () => filteredLeads.map((l, idx) => getLeadUniqueKey(l, idx)),
    [filteredLeads]
  );

  const selectedFilteredCount = useMemo(() => {
    let count = 0;
    for (const k of allFilteredKeys) {
      if (selectedLeadKeys.has(k)) count++;
    }
    return count;
  }, [allFilteredKeys, selectedLeadKeys]);

  const isAllSelected = allFilteredKeys.length > 0 && selectedFilteredCount === allFilteredKeys.length;
  const isPartialSelected = selectedFilteredCount > 0 && selectedFilteredCount < allFilteredKeys.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadKeys(new Set());
    } else {
      setSelectedLeadKeys(new Set(allFilteredKeys));
    }
  };

  const toggleSelectLead = (key: string) => {
    setSelectedLeadKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Active leads for export (export selected if any selected, otherwise export all filtered)
  const activeExportLeads = useMemo(() => {
    if (selectedFilteredCount > 0) {
      return filteredLeads.filter((l, idx) => selectedLeadKeys.has(getLeadUniqueKey(l, idx)));
    }
    return filteredLeads;
  }, [filteredLeads, selectedLeadKeys, selectedFilteredCount]);

  const handleRemoveSelected = () => {
    if (selectedFilteredCount === 0) return;
    const keysToRemove = new Set(
      filteredLeads
        .map((l, idx) => getLeadUniqueKey(l, idx))
        .filter((k) => selectedLeadKeys.has(k))
    );
    setLeads((prev) => prev.filter((l, idx) => !keysToRemove.has(getLeadUniqueKey(l, idx))));
    setSelectedLeadKeys(new Set());
    setStatusMessage(`Removed ${keysToRemove.size} selected leads from current results.`);
  };

  // Apify integration status state
  const [apifyStatus, setApifyStatus] = useState<{
    configured: boolean;
    google_maps_provider?: "compass" | "poidata";
    limits?: any;
    unitPrices?: {
      google_maps: number;
      google_maps_compass?: number;
      google_maps_poidata?: number;
      meta_ads: number;
      b2b_leads: number;
    };
  } | null>(null);

  const isServiceConfigured = apifyStatus
    ? apifyStatus.configured
    : isConfigured;

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
    // Restore non-keyword filter settings if previously stored
    try {
      const savedMetaCountry = sessionStorage.getItem("autohub_lead_meta_country");
      if (savedMetaCountry) setMetaCountry(savedMetaCountry);
      const savedMetaCity = sessionStorage.getItem("autohub_lead_meta_city");
      if (savedMetaCity) setMetaCity(savedMetaCity);
      const savedMetaStatus = sessionStorage.getItem("autohub_lead_meta_status");
      if (savedMetaStatus) setMetaAdStatus(savedMetaStatus as "active" | "all");
      const savedEmails = sessionStorage.getItem("autohub_lead_emails");
      if (savedEmails !== null) setFindEmails(savedEmails === "true");
      const savedLiTitles = sessionStorage.getItem("autohub_lead_li_titles");
      if (savedLiTitles) {
        try { setSelectedTitles(JSON.parse(savedLiTitles)); } catch {}
      }
      const savedLiCountry = sessionStorage.getItem("autohub_lead_li_country");
      if (savedLiCountry) setLinkedinCountry(savedLiCountry);
      const savedLiCity = sessionStorage.getItem("autohub_lead_li_city");
      if (savedLiCity) setLinkedinCity(savedLiCity);
      const savedLiDm = sessionStorage.getItem("autohub_lead_li_dm");
      if (savedLiDm !== null) setFindDecisionMakers(savedLiDm === "true");
      const savedLiMaxDm = sessionStorage.getItem("autohub_lead_li_max_dm");
      if (savedLiMaxDm) setMaxDecisionMakers(Number(savedLiMaxDm) || 3);
    } catch {}

    // 1. Apify Service status
    fetch("/api/v1/apify/status")
      .then((res) => res.json())
      .then((data) => {
        const payload = data?.data || data;
        if (payload && typeof payload.configured === "boolean") {
          setApifyStatus(payload);
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

    // 3. Check URL query params for oauth redirect & clean trailing ? from URL
    if (typeof window !== "undefined") {
      if (window.location.href.endsWith("?")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("google_connected") === "true") {
        setTimeout(() => {
          setStatusMessage("Google Account connected successfully! You can now 1-click export leads to Google Sheets.");
        }, 0);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__extractLeads = () => handleSearch();
    }
  }, [keyword, location, maxResultsStr, findEmails]);



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
    if (activeExportLeads.length === 0) return false;
    const rows = activeExportLeads.map(formatLeadRowForExport);
    const tsvContent = generateTsvContent(STANDARD_EXPORT_HEADERS, rows);
    const htmlTable = generateHtmlTableContent(STANDARD_EXPORT_HEADERS, rows);

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
    if (activeExportLeads.length === 0) return;

    // 1. If connected with Google OAuth, create and populate directly in Google Drive
    if (googleAuthStatus?.connected) {
      setExportingSheets(true);
      setStatusMessage("Creating Google Spreadsheet directly in your Google Drive...");

      try {
        const exportRows = activeExportLeads.map(formatLeadRowForExport);

        const res = await fetch("/api/v1/leads/export/google-sheets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leads: activeExportLeads,
            headers: STANDARD_EXPORT_HEADERS,
            rows: exportRows,
            title: `AutoHub Leads - ${keyword || "Search"} in ${location || "Region"} (${new Date().toLocaleDateString()})`,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data.message || data.error || "Failed to export to Google Sheets");
        }

        setExportedSheetUrl(data.spreadsheetUrl);
        setStatusMessage(`Exported ${activeExportLeads.length} leads directly to Google Sheets!`);
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

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const handleCancel = async () => {
    stopPolling();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (activeSearchId) {
      try {
        await fetch(`/api/v1/leads/searches/${activeSearchId}/cancel`, { method: "POST" });
      } catch {}
      setActiveSearchId(null);
    }
    setLoading(false);
    setScraping(false);
    setProgressPct(0);
    setCurrentStep("Operation canceled by user.");
    setStatusMessage("Operation canceled by user.");
  };

  // 1. Initial Lead Extraction with Live Polling
  const handleSearch = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const cleanKw = keyword.trim();
    const cleanLoc = location.trim();
    const cleanMax = maxResultsStr.trim() || "25";
    const numMax = parseInt(cleanMax, 10);

    const errors: { keyword?: string; location?: string; maxResults?: string } = {};

    if (isGoogleMaps) {
      if (!cleanKw) {
        errors.keyword = "Keyword লিখুন";
      }
      if (!cleanLoc) {
        errors.location = "Location লিখুন";
      }
    } else if (isMeta) {
      if (!cleanKw) {
        errors.keyword = "Keyword লিখুন";
      }
    } else if (isLinkedIn) {
      if (!cleanKw && selectedTitles.length === 0 && !linkedinIndustry.trim() && !linkedinState.trim()) {
        errors.keyword = "Keyword, Job Title অথবা Industry নির্বাচন করুন";
      }
    }

    if (isNaN(numMax) || numMax < 1 || numMax > currentMaxLimit) {
      errors.maxResults = `১ থেকে ${currentMaxLimit}-এর মধ্যে একটা সংখ্যা লিখুন`;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    const effectiveLoc = isMeta
      ? metaCountry
      : isLinkedIn
      ? (linkedinState.trim() ? `${linkedinCity.trim() ? linkedinCity.trim() + ", " : ""}${linkedinState.trim()}, ${linkedinCountry}` : (linkedinCity.trim() ? `${linkedinCity.trim()}, ${linkedinCountry}` : cleanLoc || linkedinCountry))
      : cleanLoc;

    const boundedMax = Math.min(Math.max(numMax, 1), currentMaxLimit);

    stopPolling();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setProgressPct(5);
    setCurrentStep("Connecting to Apify and starting scraper...");
    setStatusMessage(`Initializing search for "${cleanKw || (selectedTitles[0] || 'B2B Leads')}" in "${effectiveLoc}"...`);

    try {
      const res = await fetch("/api/v1/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          lines: isGoogleMaps
            ? [{ niche: cleanKw, location: effectiveLoc }]
            : undefined,
          keyword: cleanKw,
          location: effectiveLoc,
          industry: isLinkedIn ? (linkedinIndustry.trim() || undefined) : undefined,
          country: isMeta ? metaCountry : isLinkedIn ? linkedinCountry : undefined,
          state: isLinkedIn && linkedinState.trim() ? linkedinState.trim() : undefined,
          city: isLinkedIn && linkedinCity.trim() ? linkedinCity.trim() : undefined,
          ad_status: isMeta ? metaAdStatus : undefined,
          max_results: boundedMax,
          find_emails: isGoogleMaps ? findEmails : undefined,
          titles: isLinkedIn ? selectedTitles : undefined,
          seniority: isLinkedIn ? selectedSeniority : undefined,
          company_size: isLinkedIn ? companySize : undefined,
          require_email: isLinkedIn ? requireEmailOnly : undefined,
          require_phone: isLinkedIn ? requirePhoneOnly : undefined,
          find_decision_makers: isLinkedIn ? findDecisionMakers : undefined,
          max_decision_makers: isLinkedIn ? maxDecisionMakers : undefined,
        }),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const searchId = data.data?.searchId;
      if (!searchId) {
        throw new Error("Did not receive a search ID from server.");
      }

      setActiveSearchId(searchId);

      // Start Polling Loop
      const startTime = Date.now();
      const maxPollTimeMs = 300000; // 5 minutes

      pollTimerRef.current = setInterval(async () => {
        if (Date.now() - startTime > maxPollTimeMs) {
          stopPolling();
          setLoading(false);
          setStatusMessage("Search job timed out. Please try again or check past search runs.");
          return;
        }

        try {
          const pollRes = await fetch(`/api/v1/leads/searches/${searchId}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();
          const searchMeta = pollData.data?.search;
          const pollLeads: ComprehensiveLead[] = pollData.data?.leads || [];

          if (searchMeta) {
            if (searchMeta.progress_pct !== undefined) {
              setProgressPct(searchMeta.progress_pct);
            }
            if (searchMeta.current_step) {
              setCurrentStep(searchMeta.current_step);
              setStatusMessage(searchMeta.current_step);
            }

            if (searchMeta.status === "completed" || searchMeta.status === "partial") {
              stopPolling();
              setLoading(false);
              setLeads(pollLeads);
              const dupCount = searchMeta.duplicates_skipped || 0;
              const dupNote = dupCount > 0 ? ` (${dupCount} duplicates skipped)` : "";
              if (pollLeads.length === 0) {
                if (searchMeta.error) {
                  setStatusMessage(searchMeta.error);
                } else if (searchMeta.current_step && searchMeta.current_step.includes("Apify কী-তে Paid Plan")) {
                  setStatusMessage(searchMeta.current_step);
                } else if (isLinkedIn) {
                  const suggestions: string[] = [];
                  if (keyword) suggestions.push(`Keywords ("${keyword}")`);
                  if (linkedinCity) suggestions.push(`City ("${linkedinCity}")`);
                  if (selectedTitles.length > 0 && selectedSeniority.length > 0) {
                    suggestions.push("Seniority ও Job Titles উভয়ের কড়াকড়ি");
                  }
                  const tip = suggestions.length > 0
                    ? ` — ফিল্টার শিথিল করতে ${suggestions.join(" বা ")} সরিয়ে চেষ্টা করুন।`
                    : " — অনুগ্রহ করে ফিল্টার কিছুটা শিথিল করে চেষ্টা করুন।";
                  setStatusMessage(`এই ফিল্টারে কোনো B2B লিড পাওয়া যায়নি${tip}`);
                } else if (isMeta) {
                  setStatusMessage("Meta Ad Library-তে এই কিওয়ার্ডে কোনো বিজ্ঞাপন পাওয়া যায়নি। ভিন্ন কিওয়ার্ড দিয়ে চেষ্টা করুন।");
                } else {
                  setStatusMessage("Google Maps-এ কোনো প্রতিষ্ঠান পাওয়া যায়নি। ভিন্ন কিওয়ার্ড বা লোকেশন দিয়ে চেষ্টা করুন।");
                }
              } else {
                setStatusMessage(
                  `Lead extraction complete: Extracted ${pollLeads.length} leads${dupNote}.`
                );
              }
            } else if (searchMeta.status === "failed") {
              stopPolling();
              setLoading(false);
              const errMsg = searchMeta.error || searchMeta.current_step || "Scraper চালাতে সমস্যা হয়েছে, একটু পরে চেষ্টা করুন";
              setStatusMessage(errMsg);
            } else if (searchMeta.status === "cancelled") {
              stopPolling();
              setLoading(false);
              setStatusMessage("Search was cancelled by user.");
            }
          }
        } catch {
          // Ignore transient polling fetch errors
        }
      }, 1500);
    } catch (err: any) {
      stopPolling();
      setLoading(false);
      abortControllerRef.current = null;
      if (err.name === "AbortError") {
        setStatusMessage("Search canceled by user.");
      } else {
        setStatusMessage(`Search failed: ${err.message}`);
      }
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

  // Export as TSV / HTML to clipboard
  const handleCopyTsv = async () => {
    if (activeExportLeads.length === 0) return;
    const ok = await copyFormattedLeadsToClipboard();
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      setStatusMessage(
        `Copied ${activeExportLeads.length} lead${activeExportLeads.length > 1 ? "s" : ""} (all 25 columns) to clipboard!`
      );
    }
  };

  // Export as RFC-4180 CSV with UTF-8 BOM
  const handleDownloadCsv = () => {
    if (activeExportLeads.length === 0) return;
    const rows = activeExportLeads.map(formatLeadRowForExport);
    const csvContent = generateCsvContent(STANDARD_EXPORT_HEADERS, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const cleanKw = (keyword || "leads").replace(/[^a-zA-Z0-9_-]/g, "_");
    const cleanLoc = (location || "global").replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `leads-${source}-${activeExportLeads.length}-${cleanKw}-${cleanLoc}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setStatusMessage(`Downloaded CSV with ${activeExportLeads.length} leads (25 columns with Excel UTF-8 BOM).`);
  };

  return (
    <div className="space-y-6">
      {/* Service Configuration Notice */}
      {!isServiceConfigured && (
        <div className="rounded-xl border border-warning/30 bg-warningBg p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-surface border border-warning/30 text-warning shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg">Service not configured, contact admin</h3>
              <p className="text-xs text-muted mt-0.5">
                The lead generation engine has not been configured with an active provider token. Scraping is currently disabled until an administrator configures Apify.
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Search Input Box */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(e);
          }}
          className="space-y-4"
        >
          {isMeta ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Ad Campaign Niche / Keyword</label>
                  <input
                    type="text"
                    id="lead-keyword-input"
                    className="input h-11 w-full text-sm placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="যেমন: Real Estate, Restaurant, Gym"
                    value={keyword}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch(e);
                      }
                    }}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      if (fieldErrors.keyword) {
                        setFieldErrors((prev) => ({ ...prev, keyword: undefined }));
                      }
                    }}
                  />
                  {fieldErrors.keyword && (
                    <p className="text-destructive text-xs mt-1 font-medium">{fieldErrors.keyword}</p>
                  )}
                </div>

                <div>
                  <label className="label">Target Country (Meta Ad Region)</label>
                  <select
                    className="input h-10 text-sm"
                    value={metaCountry}
                    onChange={(e) => {
                      setMetaCountry(e.target.value);
                      try { sessionStorage.setItem("autohub_lead_meta_country", e.target.value); } catch {}
                    }}
                  >
                    {META_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-surface">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 items-center">
                <div>
                  <label className="label">Ad Delivery Status</label>
                  <select
                    className="input h-10 text-sm"
                    value={metaAdStatus}
                    onChange={(e) => {
                      const val = e.target.value as "active" | "all";
                      setMetaAdStatus(val);
                      try { sessionStorage.setItem("autohub_lead_meta_status", val); } catch {}
                    }}
                  >
                    <option value="active" className="bg-surface">
                      Active Ads Only (Recommended)
                    </option>
                    <option value="all" className="bg-surface">
                      All Ads (Active &amp; Inactive)
                    </option>
                  </select>
                </div>

                <div className="rounded-xl px-4 py-2.5 border border-border bg-bgSubtle flex items-center gap-2 text-xs text-muted">
                  <Globe size={15} className="text-brand shrink-0" />
                  <span>
                    <strong>Note:</strong> Meta Ad Library search is country-based, not city-based.
                  </span>
                </div>
              </div>
            </div>
          ) : isLinkedIn ? (
            <div className="space-y-4">
              {/* Presets Row */}
              <div className="p-3.5 rounded-xl bg-bgSubtle border border-border space-y-2">
                <span className="text-xs font-semibold text-fg">1-Click Guided Presets:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTitles(["Owner", "Founder", "CEO", "Managing Director"]);
                      setSelectedSeniority([]);
                      setKeyword("");
                      setLinkedinIndustry("marketing & advertising");
                      setLinkedinCountry("US");
                      setLinkedinState("");
                      setLinkedinCity("");
                      setCompanySize("");
                      setMaxResultsStr("10");
                    }}
                    className="btn btn-ghost border border-border text-xs !py-1 !px-2.5 hover:border-brand/40"
                  >
                    Agency owners – USA
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTitles(["Broker", "Owner", "Principal"]);
                      setSelectedSeniority([]);
                      setKeyword("");
                      setLinkedinIndustry("real estate");
                      setLinkedinCountry("US");
                      setLinkedinState("TX");
                      setLinkedinCity("");
                      setCompanySize("");
                      setMaxResultsStr("10");
                    }}
                    className="btn btn-ghost border border-border text-xs !py-1 !px-2.5 hover:border-brand/40"
                  >
                    Real-estate brokers – Texas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTitles(["Founder", "Co-Founder", "CEO"]);
                      setSelectedSeniority([]);
                      setKeyword("");
                      setLinkedinIndustry("computer software");
                      setLinkedinCountry("US");
                      setLinkedinState("");
                      setLinkedinCity("");
                      setCompanySize("");
                      setMaxResultsStr("10");
                    }}
                    className="btn btn-ghost border border-border text-xs !py-1 !px-2.5 hover:border-brand/40"
                  >
                    SaaS Founders – California
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTitles(["Dentist", "Practice Owner", "Doctor"]);
                      setSelectedSeniority([]);
                      setKeyword("");
                      setLinkedinIndustry("hospital & health care");
                      setLinkedinCountry("US");
                      setLinkedinState("");
                      setLinkedinCity("");
                      setCompanySize("");
                      setMaxResultsStr("10");
                    }}
                    className="btn btn-ghost border border-border text-xs !py-1 !px-2.5 hover:border-brand/40"
                  >
                    Dentistry Practices – Florida
                  </button>
                </div>
              </div>

              {/* Row 1: Industry & Keywords */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Target Industry</label>
                  <input
                    type="text"
                    list="b2b-industries-list"
                    className="input h-11 w-full text-sm placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="যেমন: Computer Software, Real Estate, Marketing"
                    value={linkedinIndustry}
                    onChange={(e) => setLinkedinIndustry(e.target.value)}
                  />
                  <datalist id="b2b-industries-list">
                    <option value="Computer Software" />
                    <option value="Information Technology & Services" />
                    <option value="Internet" />
                    <option value="Marketing & Advertising" />
                    <option value="Real Estate" />
                    <option value="Financial Services" />
                    <option value="Management Consulting" />
                    <option value="Hospital & Health Care" />
                    <option value="Construction" />
                    <option value="Retail" />
                    <option value="Automotive" />
                    <option value="Staffing & Recruiting" />
                  </datalist>
                </div>

                <div>
                  <label className="label">Company Descriptions / Keywords</label>
                  <input
                    type="text"
                    id="lead-keyword-input"
                    className="input h-11 w-full text-sm placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="যেমন: AI SaaS, Solar installer, Digital Agency"
                    value={keyword}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch(e);
                      }
                    }}
                    onChange={(e) => {
                      setKeyword(e.target.value);
                      if (fieldErrors.keyword) {
                        setFieldErrors((prev) => ({ ...prev, keyword: undefined }));
                      }
                    }}
                  />
                  {fieldErrors.keyword && (
                    <p className="text-destructive text-xs mt-1 font-medium">{fieldErrors.keyword}</p>
                  )}
                </div>
              </div>

              {/* Row 2: Location (Country, US State, City) */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Country</label>
                  <select
                    className="input h-10 text-sm"
                    value={linkedinCountry}
                    onChange={(e) => setLinkedinCountry(e.target.value)}
                  >
                    {META_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code} className="bg-surface">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">US State (Code or Name)</label>
                  <input
                    type="text"
                    className="input h-10 text-sm placeholder:text-muted"
                    placeholder="যেমন: NY, CA, TX, FL"
                    value={linkedinState}
                    onChange={(e) => setLinkedinState(e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input h-10 text-sm placeholder:text-muted"
                    placeholder="যেমন: New York, Austin, Chicago"
                    value={linkedinCity}
                    onChange={(e) => setLinkedinCity(e.target.value)}
                  />
                </div>
              </div>

              {/* Row 3: Company Size & Verified Contacts Toggles */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="label">Company Size</label>
                  <select
                    className="input h-10 text-sm"
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                  >
                    <option value="">Any company size</option>
                    <option value="1-10">1 – 10 employees (Seed / Boutique)</option>
                    <option value="11-20">11 – 20 employees (Small)</option>
                    <option value="21-50">21 – 50 employees</option>
                    <option value="51-100">51 – 100 employees (Medium)</option>
                    <option value="101-200">101 – 200 employees</option>
                    <option value="201-500">201 – 500 employees (Mid-Market)</option>
                    <option value="501-1000">501 – 1,000 employees</option>
                    <option value="1001-2000">1,001 – 2,000 employees</option>
                    <option value="2001-5000">2,001 – 5,000 employees</option>
                    <option value="5001-10000">5,001 – 10,000 employees</option>
                    <option value="10000+">10,000+ employees (Enterprise)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-fg h-10 p-2 rounded-lg bg-bgSubtle border border-border">
                    <input
                      type="checkbox"
                      checked={requireEmailOnly}
                      onChange={(e) => setRequireEmailOnly(e.target.checked)}
                      className="rounded text-brand"
                    />
                    <span>Only leads with verified email</span>
                  </label>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-fg h-10 p-2 rounded-lg bg-bgSubtle border border-border">
                    <input
                      type="checkbox"
                      checked={requirePhoneOnly}
                      onChange={(e) => setRequirePhoneOnly(e.target.checked)}
                      className="rounded text-brand"
                    />
                    <span>Require direct phone</span>
                  </label>
                </div>
              </div>

              {/* Seniority Multi-select Checkboxes */}
              <div className="p-3.5 rounded-xl bg-bgSubtle border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <User size={13} className="text-brand" />
                    Seniority Levels ({selectedSeniority.length} selected)
                  </label>
                  <span className="text-[11px] text-muted">Select one or more roles</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    { id: "founder", label: "Founder" },
                    { id: "owner", label: "Owner" },
                    { id: "c_suite", label: "Executive (C-Suite)" },
                    { id: "director", label: "Director" },
                    { id: "partner", label: "Partner" },
                    { id: "vp", label: "VP" },
                    { id: "head", label: "Head" },
                    { id: "manager", label: "Manager" },
                    { id: "senior", label: "Senior" },
                    { id: "entry", label: "Entry Level" },
                  ].map((s) => {
                    const isChecked = selectedSeniority.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-brand/15 text-brand border-brand/50 font-semibold shadow-xs"
                            : "bg-surface text-fg border-border hover:border-brand/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          value={s.id}
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSeniority([...selectedSeniority, s.id]);
                            } else {
                              setSelectedSeniority(selectedSeniority.filter((id) => id !== s.id));
                            }
                          }}
                          className="w-3.5 h-3.5 rounded text-brand focus:ring-brand border-border"
                        />
                        <span>{s.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Target Decision Maker Title Chips */}
              <div className="p-3.5 rounded-xl bg-bgSubtle border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-fg flex items-center gap-1.5">
                    <Briefcase size={13} className="text-brand" />
                    Target Job Titles ({selectedTitles.length} active)
                  </label>
                  <span className="text-[11px] text-muted">Click to toggle role filter</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {LINKEDIN_PRESET_TITLES.map((title) => {
                    const isSelected = selectedTitles.includes(title);
                    return (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          const updated = isSelected
                            ? selectedTitles.filter((t) => t !== title)
                            : [...selectedTitles, title];
                          setSelectedTitles(updated);
                          try { sessionStorage.setItem("autohub_lead_li_titles", JSON.stringify(updated)); } catch {}
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-brand/15 text-brand border-brand/40 shadow-xs"
                            : "bg-surface text-muted border-border hover:border-brand/30 hover:text-fg"
                        }`}
                      >
                        {isSelected && <Check size={11} className="shrink-0" />}
                        <span>{title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Add Custom Title Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    className="input h-8 text-xs max-w-xs"
                    placeholder="Add custom title (e.g. Partner, VP Growth)..."
                    value={customTitleInput}
                    onChange={(e) => setCustomTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = customTitleInput.trim();
                        if (trimmed && !selectedTitles.includes(trimmed)) {
                          const updated = [...selectedTitles, trimmed];
                          setSelectedTitles(updated);
                          setCustomTitleInput("");
                          try { sessionStorage.setItem("autohub_lead_li_titles", JSON.stringify(updated)); } catch {}
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = customTitleInput.trim();
                      if (trimmed && !selectedTitles.includes(trimmed)) {
                        const updated = [...selectedTitles, trimmed];
                        setSelectedTitles(updated);
                        setCustomTitleInput("");
                        try { sessionStorage.setItem("autohub_lead_li_titles", JSON.stringify(updated)); } catch {}
                      }
                    }}
                    className="btn btn-ghost border border-border text-xs !py-1 !px-2.5 text-muted hover:text-fg"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Seniority & Job Titles Mutual Constraint Tip */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-bgSubtle border border-border text-[11px] text-muted">
                <span className="badge border-brand/40 text-brand text-[10px] px-1.5 py-0.5 font-semibold shrink-0">
                  টিপস
                </span>
                <span>
                  Seniority ও Job Titles উভয় ফিল্টার একসাথে দিলে কোয়ারি অতিরিক্ত সংকুচিত হতে পারে। বেশি লিড পেতে যেকোনো একটি ব্যবহার করুন বা ১-ক্লিক প্রেসেট বেছে নিন।
                </span>
              </div>

              {/* Compliance Notice */}
              <div className="rounded-xl px-4 py-2.5 border border-border bg-bgSubtle flex items-center gap-2 text-xs text-muted">
                <ShieldCheck size={14} className="text-brand shrink-0" />
                <span>
                  <strong>Compliance Note:</strong> Use data lawfully in accordance with CAN-SPAM, GDPR, and platform terms. No personal LinkedIn cookies or credentials are used.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="lead-keyword-input" className="label font-medium text-fg flex items-center gap-2 text-xs">
                  <Search size={14} className="text-brand" />
                  Business Category / Keyword
                </label>
                <input
                  id="lead-keyword-input"
                  type="text"
                  className="input h-11 w-full text-sm placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="যেমন: Real Estate, Restaurant, Gym"
                  value={keyword}
                  onChange={(e) => {
                    setKeyword(e.target.value);
                    if (fieldErrors.keyword) {
                      setFieldErrors((prev) => ({ ...prev, keyword: undefined }));
                    }
                  }}
                />
                {fieldErrors.keyword && (
                  <p className="text-destructive text-xs mt-1 font-medium">{fieldErrors.keyword}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lead-location-input" className="label font-medium text-fg flex items-center gap-2 text-xs">
                  <MapPin size={14} className="text-brand" />
                  Target Location / City
                </label>
                <input
                  id="lead-location-input"
                  type="text"
                  className="input h-11 w-full text-sm placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="যেমন: New York, Austin TX"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    if (fieldErrors.location) {
                      setFieldErrors((prev) => ({ ...prev, location: undefined }));
                    }
                  }}
                />
                {fieldErrors.location && (
                  <p className="text-destructive text-xs mt-1 font-medium">{fieldErrors.location}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-12 items-end pt-1">
            <div className={isGoogleMaps ? "sm:col-span-3 flex flex-col justify-end" : "sm:col-span-6 flex flex-col justify-end"}>
              <label htmlFor="lead-max-results-input" className="label font-medium text-fg text-xs block mb-1.5">
                Max Leads (1 – {currentMaxLimit})
              </label>
              <input
                id="lead-max-results-input"
                type="text"
                inputMode="numeric"
                className="input h-11 w-full text-sm font-mono placeholder:text-muted focus:ring-2 focus:ring-primary/40 focus:border-primary"
                placeholder="যেমন: 25"
                value={maxResultsStr}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^0-9]/g, "");
                  if (!cleaned) {
                    setMaxResultsStr("");
                  } else {
                    const num = parseInt(cleaned, 10);
                    setMaxResultsStr(num > currentMaxLimit ? String(currentMaxLimit) : cleaned);
                  }
                  if (fieldErrors.maxResults) {
                    setFieldErrors((prev) => ({ ...prev, maxResults: undefined }));
                  }
                }}
              />
              {fieldErrors.maxResults && (
                <p className="text-destructive text-xs mt-1 font-medium">{fieldErrors.maxResults}</p>
              )}
              {isLinkedIn && parseInt(maxResultsStr || "0", 10) > 100 && (
                <p className="text-amber-500 text-[11px] mt-1 font-medium">
                  Note: Free Apify প্ল্যানে actor সীমা প্রতি রানে সর্বোচ্চ ১০০ লিড; ১০০-এর বেশি চাইলে পেইড প্ল্যান প্রয়োজন হতে পারে।
                </p>
              )}
            </div>

            {isGoogleMaps && (
              <div className="sm:col-span-4 flex flex-col justify-end">
                <label htmlFor="lead-enrichment-mode-select" className="label font-medium text-fg text-xs block mb-1.5">
                  Enrichment Mode
                </label>
                <select
                  id="lead-enrichment-mode-select"
                  className="input h-11 w-full text-sm focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  value={findEmails ? "yes" : "no"}
                  onChange={(e) => {
                    const nextBool = e.target.value === "yes";
                    setFindEmails(nextBool);
                    try { sessionStorage.setItem("autohub_lead_emails", String(nextBool)); } catch {}
                  }}
                >
                  <option value="yes" className="bg-surface">
                    Deep Web Scraping (18 Fields: Emails &amp; Socials)
                  </option>
                  <option value="no" className="bg-surface">
                    Basic Map Scraper (Phone &amp; Address)
                  </option>
                </select>
              </div>
            )}

            <div className={isGoogleMaps ? "sm:col-span-5 flex flex-col justify-end" : "sm:col-span-6 flex flex-col justify-end"}>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  id="extract-leads-button"
                  onClick={(e) => handleSearch(e)}
                  disabled={loading || !isServiceConfigured}
                  loading={loading}
                  variant="primary"
                  size="lg"
                  leftIcon={<Sparkles size={18} className="shrink-0" />}
                  className="flex-1 h-11 text-sm font-semibold tracking-wide"
                >
                  {loading ? "Extracting Leads..." : "Extract Leads"}
                </Button>
                {loading && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={handleCancel}
                    leftIcon={<X size={16} />}
                    className="h-11 text-xs font-medium shrink-0"
                    title="Cancel active extraction"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Provider Safety Notice */}
        <div className="mt-3 pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted">
          <span>
            {isLinkedIn
              ? "Notice: AgenticData (Apollo & ZoomInfo Replacement) দিয়ে B2B লিড স্ক্র্যাপ হচ্ছে ($0.50/1k)। ভেরিফায়েড ইমেইল ও মোবাইল সহ।"
              : "Notice: Lead generation runs server-side with strict per-job spend safety limits."}
          </span>
          <span>Automated tenant deduplication skips duplicate contacts.</span>
        </div>

        {/* Live Active Progress Indicator with Percentage Bar */}
        {loading && (
          <div className="mt-4 rounded-xl border border-border bg-surface p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-text">
              <div className="flex items-center gap-2">
                <Search size={14} className="animate-spin text-text-muted shrink-0" />
                <span className="font-semibold text-fg">
                  {currentStep || statusMessage || "Extraction in progress..."}
                </span>
              </div>
              <span className="font-mono font-bold text-xs text-fg">{progressPct}%</span>
            </div>
            <div className="w-full bg-bgSubtle border border-border rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.max(5, Math.min(progressPct, 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted pt-0.5">
              <span>Job step: {currentStep || "Running query"}</span>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-red-500 hover:underline font-medium"
              >
                Cancel Search
              </button>
            </div>
          </div>
        )}

        {/* Status Message Display */}
        {!loading && statusMessage && (
          <div className="mt-4 rounded-xl border border-brand/30 bg-brand/10 p-3.5 text-xs text-brand-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="shrink-0 text-amber-300" />
              <span>{statusMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Results Table & Export Strip */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
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
            {!isLinkedIn && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeepWebScrape}
                disabled={leads.length === 0 || scraping}
                loading={scraping}
                leftIcon={<Globe size={14} className={scraping ? "animate-spin" : ""} />}
                title="Crawl all websites to scrape genuine emails, phones & social media accounts"
              >
                {scraping ? "Web Scraping..." : "Web Scrape All Sites"}
              </Button>
            )}

            {!isLinkedIn && scraping && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancel}
                leftIcon={<X size={14} />}
                title="Cancel web scraping"
              >
                Cancel
              </Button>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyTsv}
              disabled={activeExportLeads.length === 0}
              leftIcon={copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              title={
                selectedFilteredCount > 0
                  ? `Copy ${selectedFilteredCount} selected leads (all 25 columns) to clipboard`
                  : "Copy filtered leads (all 25 columns) to clipboard"
              }
            >
              {copied
                ? "Copied TSV!"
                : selectedFilteredCount > 0
                ? `Copy TSV (${selectedFilteredCount})`
                : "Copy TSV"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadCsv}
              disabled={activeExportLeads.length === 0}
              leftIcon={<Download size={14} />}
              title={
                selectedFilteredCount > 0
                  ? `Download CSV with ${selectedFilteredCount} selected leads`
                  : "Download CSV spreadsheet of filtered leads"
              }
            >
              {selectedFilteredCount > 0 ? `Download CSV (${selectedFilteredCount})` : "Download CSV"}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportGoogleSheets}
              disabled={activeExportLeads.length === 0 || exportingSheets}
              loading={exportingSheets}
              leftIcon={<GoogleSheetsIcon className="w-3.5 h-3.5 shrink-0" />}
              title={
                selectedFilteredCount > 0
                  ? `Export ${selectedFilteredCount} selected leads directly to Google Sheets`
                  : "Export filtered leads directly to Google Sheets"
              }
            >
              {exportingSheets
                ? "Exporting to Sheets..."
                : selectedFilteredCount > 0
                ? `Export to Sheet (${selectedFilteredCount})`
                : "Export to Google Sheet"}
            </Button>

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
                Google Spreadsheet is live in your Google Drive! All {activeExportLeads.length} leads populated with verified 25 columns.
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

        {/* Floating/Inline Bulk Action Bar when rows are selected */}
        {selectedFilteredCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-surface-2 border border-brand/50 shadow-lg text-xs animate-fade-in">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-fg">
                {selectedFilteredCount} of {filteredLeads.length} lead{selectedFilteredCount > 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={() => setSelectedLeadKeys(new Set())}
                className="text-muted hover:text-fg underline text-[11px] cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyTsv}
                leftIcon={copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
                title="Copy selected leads to clipboard"
              >
                {copied ? "Copied!" : `Copy TSV (${selectedFilteredCount})`}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadCsv}
                leftIcon={<Download size={13} />}
                title="Download CSV of selected leads"
              >
                Download CSV ({selectedFilteredCount})
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportGoogleSheets}
                disabled={exportingSheets}
                loading={exportingSheets}
                leftIcon={<GoogleSheetsIcon className="w-3.5 h-3.5 shrink-0" />}
                title="Export selected leads to Google Sheets"
              >
                {exportingSheets ? "Exporting..." : `Google Sheet (${selectedFilteredCount})`}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSelected}
                leftIcon={<Trash2 size={13} className="text-red-400" />}
                className="text-red-400 hover:text-red-300 hover:border-red-500/40"
                title="Remove selected leads from results"
              >
                Remove ({selectedFilteredCount})
              </Button>
            </div>
          </div>
        )}

        {/* Real-time In-Table Quick Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="text"
              className="input h-9 pl-8 pr-8 text-xs w-full"
              placeholder={
                isLinkedIn
                  ? "Quick search person, job title, company, email, phone..."
                  : isMeta
                  ? "Quick search advertiser, ad copy, CTA, landing URL, email..."
                  : "Quick search company, contact, email, phone, decision maker..."
              }
              value={quickSearchQuery}
              onChange={(e) => setQuickSearchQuery(e.target.value)}
            />
            {quickSearchQuery && (
              <button
                type="button"
                onClick={() => setQuickSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg p-0.5"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="text-[11px] text-muted self-center">
            Showing {filteredLeads.length} of {leads.length} leads
          </div>
        </div>

        {/* Meta Ads Filter Controls */}
        {isMeta && leads.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-2/60 border border-border/70 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-fg text-[11px] mr-1">
              <Filter size={13} className="text-brand" />
              <span>Meta Filters:</span>
            </div>

            {/* Ad Status */}
            <select
              value={metaFilterStatus}
              onChange={(e) => setMetaFilterStatus(e.target.value as any)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Ad Status: All</option>
              <option value="active">Active Only</option>
            </select>

            {/* Running Days */}
            <select
              value={metaFilterMinDays}
              onChange={(e) => setMetaFilterMinDays(Number(e.target.value))}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value={0}>Running Days: Any</option>
              <option value={7}>&gt; 7 Days</option>
              <option value={30}>&gt; 30 Days</option>
              <option value={90}>&gt; 90 Days</option>
            </select>

            {/* Ad Count */}
            <select
              value={metaFilterMinAds}
              onChange={(e) => setMetaFilterMinAds(Number(e.target.value))}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value={0}>Ad Count: Any</option>
              <option value={2}>2+ Ads</option>
              <option value={5}>5+ Ads</option>
              <option value={10}>10+ Ads</option>
            </select>

            {/* Platform */}
            <select
              value={metaFilterPlatform}
              onChange={(e) => setMetaFilterPlatform(e.target.value)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Platform: All</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>

            {/* Has Website */}
            <select
              value={metaFilterHasWebsite}
              onChange={(e) => setMetaFilterHasWebsite(e.target.value as any)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Landing Page: All</option>
              <option value="yes">Has Website</option>
              <option value="no">No Website</option>
            </select>

            {/* Reset button if any filter active */}
            {(metaFilterStatus !== "all" ||
              metaFilterMinDays > 0 ||
              metaFilterMinAds > 0 ||
              metaFilterPlatform !== "all" ||
              metaFilterHasWebsite !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setMetaFilterStatus("all");
                  setMetaFilterMinDays(0);
                  setMetaFilterMinAds(0);
                  setMetaFilterPlatform("all");
                  setMetaFilterHasWebsite("all");
                }}
                className="text-[11px] text-accent-pink hover:underline font-medium px-2 py-1 rounded hover:bg-accent-pink/10 transition-colors ml-auto cursor-pointer"
              >
                Reset Meta Filters
              </button>
            )}
          </div>
        )}

        {/* LinkedIn B2B Filter Controls */}
        {isLinkedIn && leads.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-surface-2/60 border border-border/70 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-fg text-[11px] mr-1">
              <Filter size={13} className="text-brand" />
              <span>B2B Filters:</span>
            </div>

            {/* Seniority */}
            <select
              value={linkedinFilterSeniority}
              onChange={(e) => setLinkedinFilterSeniority(e.target.value)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Seniority: All</option>
              <option value="cxo">Founder / CXO</option>
              <option value="vp">VP</option>
              <option value="director">Director</option>
              <option value="manager">Manager</option>
              <option value="staff">Staff</option>
            </select>

            {/* Company Size */}
            <select
              value={linkedinFilterCompanySize}
              onChange={(e) => setLinkedinFilterCompanySize(e.target.value)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Company Size: All</option>
              <option value="1-10">1 – 10 employees</option>
              <option value="11-50">11 – 50 employees</option>
              <option value="51-200">51 – 200 employees</option>
              <option value="201-500">201 – 500 employees</option>
              <option value="500">500+ employees</option>
            </select>

            {/* Has Email */}
            <select
              value={linkedinFilterHasEmail}
              onChange={(e) => setLinkedinFilterHasEmail(e.target.value as any)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Email: All</option>
              <option value="yes">Has Email</option>
              <option value="no">No Email</option>
            </select>

            {/* Has Phone */}
            <select
              value={linkedinFilterHasPhone}
              onChange={(e) => setLinkedinFilterHasPhone(e.target.value as any)}
              className="bg-surface text-fg border border-border rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-brand focus:outline-none"
            >
              <option value="all">Phone: All</option>
              <option value="yes">Has Phone</option>
              <option value="no">No Phone</option>
            </select>

            {/* Group by Company Toggle */}
            <button
              type="button"
              onClick={() => setGroupByCompany(!groupByCompany)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                groupByCompany
                  ? "bg-brand text-white border-brand shadow-xs"
                  : "bg-surface text-muted hover:text-fg border-border"
              }`}
            >
              <Building2 size={12} />
              <span>{groupByCompany ? "Grouped by Company" : "Group by Company"}</span>
            </button>

            {/* Reset button if any filter active */}
            {(linkedinFilterSeniority !== "all" ||
              linkedinFilterCompanySize !== "all" ||
              linkedinFilterHasEmail !== "all" ||
              linkedinFilterHasPhone !== "all" ||
              groupByCompany) && (
              <button
                type="button"
                onClick={() => {
                  setLinkedinFilterSeniority("all");
                  setLinkedinFilterCompanySize("all");
                  setLinkedinFilterHasEmail("all");
                  setLinkedinFilterHasPhone("all");
                  setGroupByCompany(false);
                }}
                className="text-[11px] text-accent-pink hover:underline font-medium px-2 py-1 rounded hover:bg-accent-pink/10 transition-colors ml-auto cursor-pointer"
              >
                Reset B2B Filters
              </button>
            )}
          </div>
        )}

        {/* Organized Leads Container - NO horizontal slider, completely fits the page cleanly */}
        <div className="w-full rounded-2xl border border-white/5 bg-surface/30 overflow-hidden">
          <div className="w-full">
            {/* Desktop Header */}
            {isMeta ? (
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-surface-2/70 border-b border-border/80 text-muted uppercase text-[11px] font-semibold tracking-wider items-center">
                <div className="col-span-3 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartialSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                    title={isAllSelected ? "Deselect All" : "Select All"}
                  />
                  <span>Advertiser</span>
                </div>
                <div className="col-span-2">Ad Stats</div>
                <div className="col-span-3">Top Ad Creative &amp; CTA</div>
                <div className="col-span-2">Landing Page &amp; Country</div>
                <div className="col-span-1">Contacts</div>
                <div className="col-span-1 text-center">Action</div>
              </div>
            ) : isLinkedIn ? (
              groupByCompany ? (
                <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-surface-2/70 border-b border-border/80 text-muted uppercase text-[11px] font-semibold tracking-wider items-center">
                  <div className="col-span-4 flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartialSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    />
                    <span>Company &amp; Decision Makers</span>
                  </div>
                  <div className="col-span-2">Company Size &amp; Web</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-3">Company Contacts</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>
              ) : (
                <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-surface-2/70 border-b border-border/80 text-muted uppercase text-[11px] font-semibold tracking-wider items-center">
                  <div className="col-span-3 flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartialSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                      title={isAllSelected ? "Deselect All" : "Select All"}
                    />
                    <span>Person &amp; Title</span>
                  </div>
                  <div className="col-span-3">Company &amp; Size</div>
                  <div className="col-span-2">Location</div>
                  <div className="col-span-3">Verified Contacts</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>
              )
            ) : (
              <div className="hidden lg:grid grid-cols-12 gap-3 px-4 py-3 bg-surface-2/70 border-b border-border/80 text-muted uppercase text-[11px] font-semibold tracking-wider items-center">
                <div className="col-span-3 flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isPartialSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                    title={isAllSelected ? "Deselect All" : "Select All"}
                  />
                  <span>Company &amp; Address</span>
                </div>
                <div className="col-span-2">Company Contacts</div>
                <div className="col-span-2">Founder Level</div>
                <div className="col-span-2">Manager Level</div>
                <div className="col-span-2">Social Profiles</div>
                <div className="col-span-1 text-center">Action</div>
              </div>
            )}

            {/* Leads Rows */}
            <div className="divide-y divide-border/60">
              {filteredLeads.length === 0 ? (
                <div className="py-16 text-center text-muted text-xs flex flex-col items-center justify-center space-y-2.5">
                  <p className="max-w-xl text-center leading-relaxed">
                    {leads.length === 0
                      ? loading
                        ? isMeta
                          ? "Querying Meta Ad Library & grouping ads by advertiser..."
                          : isLinkedIn
                          ? "Querying B2B database & searching verified decision makers..."
                          : "Extracting leads from places and searching genuine data..."
                        : isMeta
                          ? "No Meta advertisers found yet. Run an Ad Library search above."
                          : isLinkedIn
                          ? (statusMessage || "No B2B leads found yet. Run a LinkedIn B2B search above.")
                          : "No leads gathered yet. Run search above to extract genuine business records."
                      : "No leads match the active filters. Try clearing some filters."}
                  </p>
                  {isLinkedIn && !loading && leads.length === 0 && (keyword || linkedinCity || (selectedTitles.length > 0 && selectedSeniority.length > 0)) && (
                    <button
                      type="button"
                      onClick={() => {
                        setKeyword("");
                        setLinkedinCity("");
                        if (selectedTitles.length > 0 && selectedSeniority.length > 0) {
                          setSelectedTitles([]);
                        }
                        setStatusMessage("ফিল্টার শিথিল করা হয়েছে (Keywords ও City সরানো হয়েছে)। এবার 'Extract Leads' এ ক্লিক করে আবার অনুসন্ধান চালান।");
                      }}
                      className="btn btn-outline text-xs px-3.5 py-1.5 mt-2 flex items-center gap-1.5 text-brand border-brand/40 hover:bg-brand/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw size={12} />
                      <span>ফিল্টার শিথিল করুন (Relax Filters)</span>
                    </button>
                  )}
                </div>
              ) : isLinkedIn && groupByCompany ? (
                groupedCompanies.map((group, gIdx) => {
                  const l = group.primaryLead;
                  const leadKey = `company_${gIdx}_${group.companyName}`;
                  const allEmails = Array.from(
                    new Set(
                      group.leads.flatMap((lead) => [
                        ...(lead.founder_emails || []),
                        ...(lead.company_emails || []),
                        lead.extra?.founder_email,
                      ]).filter(Boolean)
                    )
                  );
                  const allPhones = Array.from(
                    new Set(
                      group.leads.flatMap((lead) => [
                        ...(lead.founder_phones || []),
                        ...(lead.company_phones || []),
                      ]).filter(Boolean)
                    )
                  );

                  return (
                    <div
                      key={leadKey}
                      className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 transition-colors text-xs items-start hover:bg-surface-2/60 border-l-2 border-l-brand/40"
                    >
                      {/* 1. Company & Decision Makers (col-span-4) */}
                      <div className="lg:col-span-4 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-fg text-sm">{group.companyName}</span>
                          <span className="badge border-brand/40 text-brand bg-brand/10 text-[10px] px-2 py-0.5 font-bold">
                            {group.leads.length} Decision Maker{group.leads.length > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Decision Makers List */}
                        <div className="space-y-1.5 pt-0.5">
                          {group.leads.map((dmLead, dmIdx) => {
                            const name = dmLead.founder_name || dmLead.decision_makers?.[0]?.name || "Executive";
                            const title = dmLead.extra?.job_title || dmLead.decision_makers?.[0]?.title || "Leader";
                            const linkedin = dmLead.extra?.linkedin_profile_url || dmLead.decision_makers?.[0]?.profileUrl;
                            return (
                              <div
                                key={dmIdx}
                                className="p-1.5 rounded-lg bg-surface-2 border border-border flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 truncate">
                                  <span className="font-semibold text-fg text-[11px] block truncate">{name}</span>
                                  <span className="text-muted text-[10px] truncate block">{title}</span>
                                </div>
                                {linkedin && (
                                  <a
                                    href={linkedin.startsWith("http") ? linkedin : `https://${linkedin}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-sky-400 hover:underline shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 inline-flex items-center gap-1"
                                  >
                                    <span>Profile</span>
                                    <ExternalLink size={8} />
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. Company Size & Web (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Company Info:</div>
                        {(l.company_size || l.extra?.company_size) && (
                          <div className="badge border-border text-muted text-[10px] px-2 py-0.5 font-mono">
                            {l.company_size || l.extra?.company_size}
                          </div>
                        )}
                        {(l.industry || l.extra?.industry) && (
                          <div className="badge border-brand/30 text-brand bg-brand/5 text-[10px] px-2 py-0.5 truncate max-w-[150px]">
                            {l.industry || l.extra?.industry}
                          </div>
                        )}
                        {(l.company_website || l.website) && (
                          <a
                            href={l.company_website || l.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-2 hover:underline inline-flex items-center gap-1 font-mono text-[10px] truncate max-w-[150px] block"
                          >
                            <span>{(l.company_website || l.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                            <ExternalLink size={9} className="shrink-0" />
                          </a>
                        )}
                      </div>

                      {/* 3. Location (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Location:</div>
                        <div className="text-[11px] text-muted flex items-start gap-1 leading-snug break-words">
                          <MapPin size={12} className="shrink-0 text-brand mt-0.5" />
                          <span>{l.company_location || l.city || "Location unavailable"}</span>
                        </div>
                      </div>

                      {/* 4. Company Contacts (col-span-3) */}
                      <div className="lg:col-span-3 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">All Contacts:</div>
                        {allEmails.length > 0 ? (
                          allEmails.slice(0, 3).map((em: any, emIdx: number) => (
                            <div
                              key={emIdx}
                              className="badge border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md truncate"
                              title={em}
                            >
                              <Mail size={10} className="shrink-0 text-emerald-400" />
                              <span className="truncate">{em}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-muted text-[10px] italic block">No emails discovered</span>
                        )}
                        {allEmails.length > 3 && (
                          <span className="text-[9px] text-muted font-mono block">+{allEmails.length - 3} more emails</span>
                        )}
                        {allPhones.length > 0 && (
                          <div className="badge border-border text-muted font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md bg-surface-2/50 truncate">
                            <Phone size={10} className="shrink-0 text-muted" />
                            <span>{allPhones[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* 5. Action (col-span-1) */}
                      <div className="lg:col-span-1 flex lg:justify-center items-center pt-1 lg:pt-0">
                        <button
                          onClick={() => setSelectedLead(l)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-2 border border-border/80 text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-sm cursor-pointer"
                          title="View Company &amp; Decision Makers Details"
                          aria-label="View Company &amp; Decision Makers Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
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

                  const leadKey = getLeadUniqueKey(l, i);
                  const isRowSelected = selectedLeadKeys.has(leadKey);

                  if (isMeta) {
                    return (
                      <div
                        key={leadKey}
                        className={`grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 transition-colors text-xs items-start ${
                          isRowSelected
                            ? "bg-brand/10 border-l-2 border-l-brand"
                            : "hover:bg-surface-2/60"
                        }`}
                      >
                        {/* 1. Advertiser (col-span-3) */}
                        <div className="lg:col-span-3 flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => toggleSelectLead(leadKey)}
                            className="mt-1 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                            title={isRowSelected ? "Deselect row" : "Select row"}
                          />
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="font-bold text-fg text-sm break-words flex items-center gap-2 flex-wrap" title={l.company_name}>
                              <span>{l.company_name}</span>
                              {l.extra?.is_active !== false ? (
                                <span className="badge border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] px-1.5 py-0.2 shrink-0 font-medium">
                                  Active
                                </span>
                              ) : (
                                <span className="badge border-border text-muted bg-surface-2 text-[10px] px-1.5 py-0.2 shrink-0 font-medium">
                                  Inactive
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-[11px] text-muted flex-wrap">
                              {l.extra?.page_id && (
                                <span className="font-mono text-[10px] text-muted">ID: {l.extra.page_id}</span>
                              )}
                              {(l.company_facebook || l.extra?.page_id) && (
                                <a
                                  href={l.company_facebook || `https://www.facebook.com/${l.extra?.page_id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-blue-400 hover:underline inline-flex items-center gap-1 text-[11px]"
                                  title="Open Facebook Page"
                                >
                                  <span>FB Page</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                              {(l.ad_library_url || l.extra?.ad_library_url) && (
                                <a
                                  href={l.ad_library_url || l.extra?.ad_library_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand hover:underline inline-flex items-center gap-1 text-[11px]"
                                  title="Open in Meta Ad Library"
                                >
                                  <span>Ad Library</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Ad Stats (col-span-2) */}
                        <div className="lg:col-span-2 space-y-1.5 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Ad Stats:</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="badge border-brand/40 text-brand bg-brand/10 text-[11px] px-2 py-0.5 font-bold flex items-center gap-1">
                              <Sparkles size={11} />
                              {l.ad_count || l.extra?.ad_count || 1} Total Ads
                            </span>
                            {typeof l.extra?.running_days === "number" && (
                              <span className="badge border-border text-muted text-[10px] px-1.5 py-0.5 font-mono">
                                {l.extra.running_days}d running
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {(l.platforms || l.extra?.platforms || ["facebook", "instagram"]).map((p: string, pIdx: number) => (
                              <span key={pIdx} className="badge border-border/80 text-muted capitalize text-[9px] px-1.5 py-0.2">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* 3. Top Ad Creative & CTA (col-span-3) */}
                        <div className="lg:col-span-3 space-y-1.5 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Top Ad Creative:</div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(l.extra?.cta_text || l.extra?.ads?.[0]?.ctaText) && (
                              <span className="badge border-brand-2/40 text-brand-2 bg-brand-2/10 text-[10px] px-2 py-0.5 font-semibold">
                                CTA: {l.extra?.cta_text || l.extra?.ads?.[0]?.ctaText}
                              </span>
                            )}
                            {l.extra?.ads?.[0]?.mediaType && (
                              <span className="badge border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px] px-1.5 py-0.5 capitalize font-medium">
                                {l.extra.ads[0].mediaType}
                              </span>
                            )}
                          </div>
                          {l.ad_snippet || l.extra?.sample_ad_text || l.extra?.ads?.[0]?.adCopy ? (
                            <p
                              className="text-[11px] text-fg/80 italic line-clamp-2 leading-relaxed bg-surface-2/40 p-1.5 rounded-lg border border-border/50"
                              title={l.ad_snippet || l.extra?.sample_ad_text || l.extra?.ads?.[0]?.adCopy}
                            >
                              &ldquo;{l.ad_snippet || l.extra?.sample_ad_text || l.extra?.ads?.[0]?.adCopy}&rdquo;
                            </p>
                          ) : (
                            <span className="text-muted text-[11px] italic">No ad creative snippet</span>
                          )}
                        </div>

                        {/* 4. Landing Page & Country (col-span-2) */}
                        <div className="lg:col-span-2 space-y-1.5 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Landing Page &amp; Country:</div>
                          {l.company_website || l.website ? (
                            <a
                              href={l.company_website || l.website}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-2 hover:text-brand inline-flex items-center gap-1 font-mono text-[11px] underline underline-offset-2 break-all"
                              title={l.company_website || l.website}
                            >
                              <span className="truncate max-w-[170px]">
                                {l.extra?.landing_domain || (l.company_website || l.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "")}
                              </span>
                              <ExternalLink size={10} className="shrink-0" />
                            </a>
                          ) : (
                            <span className="text-muted text-[11px] italic block">No Landing Page</span>
                          )}
                          <div className="flex items-center gap-1.5 text-[10px] text-muted">
                            <MapPin size={11} className="text-brand shrink-0" />
                            <span>{l.company_location || l.city || metaCountry}</span>
                          </div>
                        </div>

                        {/* 5. Contacts (col-span-1) */}
                        <div className="lg:col-span-1 space-y-1 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Contacts:</div>
                          {companyEmails.length > 0 ? (
                            <div
                              className="badge border-border text-fg font-mono text-[9px] px-1.5 py-0.5 flex items-center gap-1 rounded break-all truncate"
                              title={companyEmails[0]}
                            >
                              <Mail size={9} className="shrink-0 text-brand" />
                              <span className="truncate">{companyEmails[0]}</span>
                            </div>
                          ) : companyPhones.length > 0 ? (
                            <div
                              className="badge border-border text-muted font-mono text-[9px] px-1.5 py-0.5 flex items-center gap-1 rounded bg-surface-2/50 truncate"
                              title={companyPhones[0]}
                            >
                              <Phone size={9} className="shrink-0 text-muted" />
                              <span className="truncate">{companyPhones[0]}</span>
                            </div>
                          ) : (
                            <span className="text-muted text-[10px] italic">Not scraped</span>
                          )}
                          {companyEmails.length + companyPhones.length > 1 && (
                            <span className="text-[9px] text-muted font-mono block">+{companyEmails.length + companyPhones.length - 1} more</span>
                          )}
                        </div>

                        {/* 6. Action Button (col-span-1) */}
                        <div className="lg:col-span-1 flex lg:justify-center items-center pt-1 lg:pt-0">
                          <button
                            onClick={() => setSelectedLead(l)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-2 border border-border/80 text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-sm cursor-pointer"
                            title="View All Ads &amp; Advertiser Details"
                            aria-label="View All Ads &amp; Advertiser Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isLinkedIn) {
                    const personName = l.founder_name || l.decision_makers?.[0]?.name || "Decision Maker";
                    const jobTitle = l.extra?.job_title || l.decision_makers?.[0]?.title || "Executive";
                    const seniority = l.extra?.seniority || "Founder/CXO";
                    const linkedinUrl = l.extra?.linkedin_profile_url || l.decision_makers?.[0]?.profileUrl;
                    const companyLinkedin = l.company_linkedin || l.extra?.company_linkedin_url;

                    return (
                      <div
                        key={leadKey}
                        className={`grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 transition-colors text-xs items-start ${
                          isRowSelected
                            ? "bg-brand/10 border-l-2 border-l-brand"
                            : "hover:bg-surface-2/60"
                        }`}
                      >
                        {/* 1. Person & Title (col-span-3) */}
                        <div className="lg:col-span-3 flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isRowSelected}
                            onChange={() => toggleSelectLead(leadKey)}
                            className="mt-1 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                            title={isRowSelected ? "Deselect row" : "Select row"}
                          />
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="font-bold text-fg text-sm break-words flex items-center gap-2 flex-wrap">
                              <span className="text-fg">{personName}</span>
                              {linkedinUrl && (
                                <a
                                  href={linkedinUrl.startsWith("http") ? linkedinUrl : `https://${linkedinUrl}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-400 hover:text-sky-300 inline-flex items-center gap-0.5 text-[11px] font-semibold"
                                  title="View LinkedIn Profile"
                                >
                                  <span>in</span>
                                  <ExternalLink size={9} />
                                </a>
                              )}
                            </div>
                            <div className="text-muted text-[11px] font-medium truncate" title={jobTitle}>
                              {jobTitle}
                            </div>
                            <div className="pt-0.5">
                              <span className="badge border-brand/40 text-brand bg-brand/10 text-[10px] px-2 py-0.5 font-semibold capitalize">
                                {seniority}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Company & Size (col-span-3) */}
                        <div className="lg:col-span-3 space-y-1.5 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Company:</div>
                          <div className="font-bold text-fg text-xs truncate" title={l.company_name}>
                            {l.company_name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {(l.company_size || l.extra?.company_size) && (
                              <span className="badge border-border text-muted text-[10px] px-2 py-0.5 font-mono inline-flex items-center gap-1">
                                <Building2 size={9} />
                                {l.company_size || l.extra?.company_size}
                              </span>
                            )}
                            {(l.industry || l.extra?.industry) && (
                              <span className="badge border-brand/30 text-brand bg-brand/5 text-[10px] px-2 py-0.5 truncate max-w-[140px]">
                                {l.industry || l.extra?.industry}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] flex-wrap">
                            {(l.company_website || l.website) && (
                              <a
                                href={l.company_website || l.website}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-2 hover:underline inline-flex items-center gap-1 font-mono text-[10px] truncate max-w-[150px]"
                              >
                                <span>{(l.company_website || l.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "")}</span>
                                <ExternalLink size={9} className="shrink-0" />
                              </a>
                            )}
                            {companyLinkedin && (
                              <a
                                href={companyLinkedin.startsWith("http") ? companyLinkedin : `https://${companyLinkedin}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-muted hover:text-sky-400 inline-flex items-center gap-0.5 text-[10px]"
                                title="Company LinkedIn"
                              >
                                <span>Co. LinkedIn</span>
                                <ExternalLink size={8} />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* 3. Location (col-span-2) */}
                        <div className="lg:col-span-2 space-y-1 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Location:</div>
                          <div className="text-[11px] text-muted flex items-start gap-1 leading-snug break-words">
                            <MapPin size={12} className="shrink-0 text-brand mt-0.5" />
                            <span>{l.company_location || l.city || l.address || "Location unavailable"}</span>
                          </div>
                        </div>

                        {/* 4. Verified Contacts (col-span-3) */}
                        <div className="lg:col-span-3 space-y-1.5 min-w-0">
                          <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Contacts:</div>
                          <div className="space-y-1">
                            {founderEmails.length > 0 || companyEmails.length > 0 || l.extra?.founder_email ? (
                              Array.from(new Set([...founderEmails, ...companyEmails, l.extra?.founder_email].filter(Boolean))).map((em: any, emIdx: number) => (
                                <div
                                  key={emIdx}
                                  className="badge border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md break-all truncate"
                                  title={`Verified Email: ${em}`}
                                >
                                  <Mail size={10} className="shrink-0 text-emerald-400" />
                                  <span className="truncate">{em}</span>
                                  <span className="ml-auto text-[8px] bg-emerald-500/20 px-1 rounded uppercase font-sans">verified</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-muted text-[10px] italic block">Email: Not Available</span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {founderPhones.length > 0 || companyPhones.length > 0 ? (
                              Array.from(new Set([...founderPhones, ...companyPhones])).map((ph, phIdx) => (
                                <div
                                  key={phIdx}
                                  className="badge border-border text-muted font-mono text-[10px] px-2 py-0.5 flex items-center gap-1.5 rounded-md bg-surface-2/50"
                                  title={`Phone: ${ph}`}
                                >
                                  <Phone size={10} className="shrink-0 text-muted" />
                                  <span>{ph}</span>
                                </div>
                              ))
                            ) : null}
                          </div>
                        </div>

                        {/* 5. Action (col-span-1) */}
                        <div className="lg:col-span-1 flex lg:justify-center items-center pt-1 lg:pt-0">
                          <button
                            onClick={() => setSelectedLead(l)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-2 border border-border/80 text-muted hover:text-brand hover:border-brand hover:bg-brand/10 transition-all shadow-sm cursor-pointer"
                            title="View Person &amp; Company Details"
                            aria-label="View Person &amp; Company Details"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={leadKey}
                      className={`grid grid-cols-1 lg:grid-cols-12 gap-3 p-4 transition-colors text-xs items-start ${
                        isRowSelected
                          ? "bg-brand/10 border-l-2 border-l-brand"
                          : "hover:bg-surface-2/60"
                      }`}
                    >
                      {/* 1. Company & Location (col-span-3) */}
                      <div className="lg:col-span-3 flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isRowSelected}
                          onChange={() => toggleSelectLead(leadKey)}
                          className="mt-1 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer shrink-0"
                          title={isRowSelected ? "Deselect row" : "Select row"}
                        />
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="font-bold text-fg text-sm break-words flex items-center gap-2 flex-wrap" title={l.company_name}>
                            <span>{l.company_name}</span>
                            {(l.rating || l.extra?.rating) && (
                              <span className="badge border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] px-1.5 py-0.2 shrink-0 font-medium">
                                ★ {l.rating || l.extra?.rating}
                                {(l.extra?.reviews_count || l.extra?.user_ratings_total) && ` (${l.extra.reviews_count || l.extra.user_ratings_total})`}
                              </span>
                            )}
                          </div>
                          <div
                            className="text-[11px] text-muted flex items-start gap-1.5 leading-snug break-words"
                            title={l.company_location || l.address || l.city || "Not Available"}
                          >
                            <MapPin size={12} className="shrink-0 text-brand mt-0.5" />
                            <span>{l.company_location || l.address || l.city || "Not Available"}</span>
                          </div>
                        {/* Meta Ads Intelligence Badge & Ad Library Link */}
                        {(l.ad_count || l.extra?.ad_count || isMeta) && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="badge border-brand/40 text-brand bg-brand/10 text-[10px] px-2 py-0.5 font-medium flex items-center gap-1">
                              <Sparkles size={10} />
                              {l.ad_count || l.extra?.ad_count || 1} Active Ads
                            </span>
                            {(l.ad_library_url || l.extra?.ad_library_url) && (
                              <a
                                href={l.ad_library_url || l.extra?.ad_library_url}
                                target="_blank"
                                rel="noreferrer"
                                className="badge border-border text-muted hover:text-fg hover:border-brand/40 text-[10px] px-2 py-0.5 inline-flex items-center gap-1 transition-colors"
                                title="View in Meta Ads Library"
                              >
                                <span>Ad Library</span>
                                <ExternalLink size={9} />
                              </a>
                            )}
                          </div>
                        )}
                        {/* LinkedIn Company Size & Industry */}
                        {(l.company_size || l.extra?.company_size || l.industry || l.extra?.industry) && (
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {(l.company_size || l.extra?.company_size) && (
                              <span className="badge border-border text-muted text-[10px] px-2 py-0.5 inline-flex items-center gap-1 font-mono">
                                <Building2 size={9} />
                                {l.company_size || l.extra?.company_size}
                              </span>
                            )}
                            {(l.industry || l.extra?.industry) && (
                              <span className="badge border-brand/30 text-brand bg-brand/5 text-[10px] px-2 py-0.5">
                                {l.industry || l.extra?.industry}
                              </span>
                            )}
                          </div>
                        )}
                        {(l.ad_snippet || l.extra?.ad_snippet) && (
                          <p
                            className="text-[10px] text-muted italic line-clamp-2 max-w-[240px] pt-0.5 leading-snug"
                            title={l.ad_snippet || l.extra?.ad_snippet}
                          >
                            &ldquo;{l.ad_snippet || l.extra?.ad_snippet}&rdquo;
                          </p>
                        )}
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

                      {/* 3. Founder Level / Decision Makers (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">
                          {isLinkedIn ? "Decision Makers:" : "Founder Level:"}
                        </div>
                        {((l.decision_makers && l.decision_makers.length > 0) ||
                          (l.extra?.decision_makers && l.extra.decision_makers.length > 0)) ? (
                          <div className="space-y-1">
                            {((l.decision_makers && l.decision_makers.length > 0)
                              ? l.decision_makers
                              : l.extra?.decision_makers || []
                            ).map((dm: any, idx: number) => (
                              <div
                                key={idx}
                                className="p-1.5 rounded-lg bg-surface-2/80 border border-border/80 text-xs flex items-center justify-between gap-1.5"
                                title={`${dm.name} - ${dm.title}`}
                              >
                                <div className="min-w-0 flex items-center gap-1.5 truncate">
                                  <User size={11} className="shrink-0 text-brand" />
                                  <div className="truncate">
                                    <div className="font-semibold text-fg text-[11px] truncate">{dm.name}</div>
                                    <div className="text-[10px] text-muted truncate">{dm.title}</div>
                                  </div>
                                </div>
                                {dm.profileUrl && (
                                  <a
                                    href={dm.profileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-brand hover:underline shrink-0 p-1 rounded hover:bg-brand/10 transition-colors"
                                    title="View LinkedIn Profile"
                                  >
                                    <ExternalLink size={10} />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <>
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
                                  {founderSocials.map((s, idx) => {
                                    const url = s.startsWith("http") ? s : `https://${s}`;
                                    return (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-accent-pink text-[9px] hover:underline"
                                      >
                                        Social {idx + 1}
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {!l.founder_name && founderEmails.length === 0 && founderPhones.length === 0 && (
                                <span className="text-muted text-[10px] italic block">Data Not Available</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 4. Manager Level / Ad Intelligence (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">
                          {isLinkedIn ? "Key Management:" : isMeta ? "Ad Intelligence:" : "Manager Level:"}
                        </div>
                        {isMeta ? (
                          <div className="space-y-1.5 min-w-0">
                            <div className="font-semibold text-fg flex items-center gap-1.5 text-xs">
                              <Sparkles size={12} className="text-brand shrink-0" />
                              <span>{l.ad_count || l.extra?.ad_count || 1} Active Campaign{(l.ad_count || l.extra?.ad_count || 1) > 1 ? "s" : ""}</span>
                            </div>
                            {(l.platforms || l.extra?.platforms) && (
                              <div className="flex items-center gap-1 flex-wrap pt-0.5">
                                {(l.platforms || l.extra?.platforms).map((p: string, pIdx: number) => (
                                  <span key={pIdx} className="badge border-border text-muted text-[9px] px-1.5 py-0.2 font-mono">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                            {(l.start_date || l.extra?.start_date) && (
                              <div className="text-[10px] text-muted">
                                Started: {new Date(l.start_date || l.extra?.start_date).toLocaleDateString()}
                              </div>
                            )}
                            {(l.ad_library_url || l.extra?.ad_library_url) && (
                              <div className="pt-0.5">
                                <a
                                  href={l.ad_library_url || l.extra?.ad_library_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-brand hover:underline inline-flex items-center gap-1 text-[10px]"
                                  title="View in Meta Ad Library"
                                >
                                  <span>View in Ad Library</span>
                                  <ExternalLink size={9} />
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
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
                                  {managerSocials.map((s, idx) => {
                                    const url = s.startsWith("http") ? s : `https://${s}`;
                                    return (
                                      <a
                                        key={idx}
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-brand-2 text-[9px] hover:underline"
                                      >
                                        Social {idx + 1}
                                      </a>
                                    );
                                  })}
                                </div>
                              ) : null}
                              {!l.manager_name && managerEmails.length === 0 && managerPhones.length === 0 && (
                                <span className="text-muted text-[10px] italic block">Data Not Available</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* 5. Social Media (col-span-2) */}
                      <div className="lg:col-span-2 space-y-1.5 min-w-0">
                        <div className="lg:hidden text-[10px] uppercase font-bold text-muted">Social Profiles:</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {l.company_facebook && (
                            <a
                              href={l.company_facebook.startsWith("http") ? l.company_facebook : `https://${l.company_facebook}`}
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
                              href={l.company_instagram.startsWith("http") ? l.company_instagram : `https://${l.company_instagram}`}
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
                              href={l.company_linkedin.startsWith("http") ? l.company_linkedin : `https://${l.company_linkedin}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-bold hover:bg-sky-500 hover:text-white transition-all shadow-xs"
                              title="LinkedIn Company"
                            >
                              LI
                            </a>
                          )}
                          {l.company_twitter && (
                            <a
                              href={l.company_twitter.startsWith("http") ? l.company_twitter : `https://${l.company_twitter}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2 py-1 rounded-md bg-neutral-500/15 text-neutral-300 border border-neutral-500/30 text-[10px] font-bold hover:bg-neutral-600 hover:text-white transition-all shadow-xs"
                              title="X / Twitter"
                            >
                              X
                            </a>
                          )}
                          {l.company_tiktok && (
                            <a
                              href={l.company_tiktok.startsWith("http") ? l.company_tiktok : `https://${l.company_tiktok}`}
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
                              href={l.company_youtube.startsWith("http") ? l.company_youtube : `https://${l.company_youtube}`}
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
                            !l.company_twitter &&
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

      {/* Complete Lead Inspector / Meta Ads Advertiser Drawer Modal */}
      {selectedLead && (
        isMeta ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface max-w-3xl w-full rounded-2xl p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge border-brand/40 text-brand text-[10px] font-semibold uppercase tracking-wider">
                      Meta Ads Advertiser Drawer
                    </span>
                    {selectedLead.extra?.is_active !== false ? (
                      <span className="badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[10px] px-2 py-0.5 font-medium">
                        Active Campaigns
                      </span>
                    ) : (
                      <span className="badge border-border text-muted bg-surface-2 text-[10px] px-2 py-0.5 font-medium">
                        Inactive
                      </span>
                    )}
                    {typeof selectedLead.extra?.running_days === "number" && (
                      <span className="badge border-border text-muted text-[10px] px-2 py-0.5 font-mono">
                        {selectedLead.extra.running_days} Days Running
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-fg mt-1 truncate">{selectedLead.company_name}</h3>
                  
                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap mt-1">
                    {selectedLead.extra?.page_id && (
                      <span className="font-mono text-[11px]">Page ID: {selectedLead.extra.page_id}</span>
                    )}
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin size={12} className="text-brand" /> {selectedLead.company_location || selectedLead.city || metaCountry}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(selectedLead.ad_library_url || selectedLead.extra?.ad_library_url) && (
                    <a
                      href={selectedLead.ad_library_url || selectedLead.extra?.ad_library_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5 shadow-sm"
                      title="Open in Meta Ad Library"
                    >
                      <span>Ad Library</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 rounded-xl border border-border text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Section 1: Advertiser Overview & Web Presence */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs rounded-2xl border border-border/70 bg-surface-2/40 p-4">
                <div>
                  <span className="text-muted block text-[11px] mb-1">Target Landing Page / Website</span>
                  {selectedLead.company_website || selectedLead.website ? (
                    <a
                      href={selectedLead.company_website || selectedLead.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-2 hover:underline inline-flex items-center gap-1 font-mono text-xs break-all"
                    >
                      <span>{selectedLead.company_website || selectedLead.website}</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <span className="text-muted italic">No landing URL detected</span>
                  )}
                </div>

                <div>
                  <span className="text-muted block text-[11px] mb-1">Facebook Page</span>
                  {(selectedLead.company_facebook || selectedLead.extra?.page_id) ? (
                    <a
                      href={selectedLead.company_facebook || `https://www.facebook.com/${selectedLead.extra?.page_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-400 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      <span>Facebook Profile</span>
                      <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-muted italic">Not Available</span>
                  )}
                </div>

                <div>
                  <span className="text-muted block text-[11px] mb-1">
                    Extracted Emails ({selectedLead.company_emails?.length || 0})
                  </span>
                  {selectedLead.company_emails?.length ? (
                    <div className="space-y-1 font-mono text-[11px] text-fg">
                      {selectedLead.company_emails.map((e, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Mail size={11} className="text-brand shrink-0" />
                          <span>{e}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted italic text-[11px]">
                      Not scraped yet. Click &ldquo;Web Scrape All Sites&rdquo; on the toolbar.
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-muted block text-[11px] mb-1">
                    Extracted Phones ({selectedLead.company_phones?.length || 0})
                  </span>
                  {selectedLead.company_phones?.length ? (
                    <div className="space-y-1 font-mono text-[11px] text-fg">
                      {selectedLead.company_phones.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <Phone size={11} className="text-muted shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted italic text-[11px]">None detected</span>
                  )}
                </div>
              </div>

              {/* Section 2: All Ads List for this Advertiser */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} className="text-brand" />
                    All Ads for this Advertiser ({selectedLead.extra?.ads?.length || selectedLead.ad_count || 1})
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {(selectedLead.platforms || selectedLead.extra?.platforms || ["facebook", "instagram"]).map((p: string, pIdx: number) => (
                      <span key={pIdx} className="badge border-border text-muted capitalize text-[10px] px-1.5 py-0.2">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {(selectedLead.extra?.ads && selectedLead.extra.ads.length > 0
                    ? selectedLead.extra.ads
                    : [
                        {
                          adId: selectedLead.extra?.page_id,
                          adCopy: selectedLead.ad_snippet || selectedLead.extra?.sample_ad_text,
                          ctaText: selectedLead.extra?.cta_text,
                          landingUrl: selectedLead.company_website || selectedLead.website,
                          platforms: selectedLead.platforms || selectedLead.extra?.platforms || [],
                          adLink: selectedLead.ad_library_url || selectedLead.extra?.ad_library_url,
                          isActive: selectedLead.extra?.is_active ?? true,
                          mediaType: "image",
                        },
                      ]
                  ).map((ad: any, adIdx: number) => {
                    return (
                      <div
                        key={adIdx}
                        className="rounded-xl border border-border/80 bg-surface-2/60 p-4 space-y-3 hover:border-brand/40 transition-colors"
                      >
                        {/* Top Ad Meta */}
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-[11px] font-bold text-fg">
                              Ad #{ad.adId || `${adIdx + 1}`}
                            </span>
                            {ad.isActive !== false ? (
                              <span className="badge border-emerald-500/40 text-emerald-400 bg-emerald-500/10 text-[9px] px-1.5 py-0.2">
                                Active
                              </span>
                            ) : (
                              <span className="badge border-border text-muted bg-surface-2 text-[9px] px-1.5 py-0.2">
                                Inactive
                              </span>
                            )}
                            {ad.mediaType && (
                              <span className="badge border-purple-500/30 text-purple-400 bg-purple-500/10 text-[9px] px-1.5 py-0.2 capitalize">
                                {ad.mediaType}
                              </span>
                            )}
                            {ad.startDate && (
                              <span className="text-[10px] text-muted">
                                Started: {new Date(ad.startDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {ad.adLink && (
                            <a
                              href={ad.adLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand hover:underline inline-flex items-center gap-1 text-[11px] font-medium"
                            >
                              <span>View Ad Snapshot</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                        </div>

                        {/* Ad Copy */}
                        {ad.adCopy ? (
                          <div className="bg-surface/80 p-3 rounded-lg border border-border/60 text-xs text-fg leading-relaxed whitespace-pre-wrap font-sans">
                            {ad.adCopy}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted italic">
                            No text creative body in this ad.
                          </div>
                        )}

                        {/* Bottom Ad Destination & CTA */}
                        <div className="flex items-center justify-between gap-2 flex-wrap pt-1 text-xs border-t border-border/40">
                          <div className="flex items-center gap-2 flex-wrap">
                            {ad.ctaText && (
                              <span className="badge border-brand-2/40 text-brand-2 bg-brand-2/10 text-[10px] px-2 py-0.5 font-bold">
                                CTA: {ad.ctaText}
                              </span>
                            )}
                            {ad.landingUrl && (
                              <a
                                href={ad.landingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-brand-2 hover:underline inline-flex items-center gap-1 text-[11px] font-mono break-all"
                              >
                                <span>{ad.landingUrl}</span>
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            )}
                          </div>

                          {ad.platforms && ad.platforms.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap">
                              {ad.platforms.map((p: string, pIdx: number) => (
                                <span key={pIdx} className="badge border-border text-muted capitalize text-[9px] px-1.5 py-0.2">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 3: Collapsible Raw JSON Data */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-surface-2/30">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-muted hover:text-fg hover:bg-surface-2/60 transition-colors cursor-pointer"
                >
                  <span>Raw Apify &amp; Meta Ad Data (JSON)</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showRawJson ? "rotate-180" : ""}`} />
                </button>
                {showRawJson && (
                  <div className="p-3 border-t border-border/60 space-y-2 bg-black/40">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedLead, null, 2));
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        className="btn btn-ghost text-[10px] !py-0.5 !px-2 border border-border"
                      >
                        {copiedJson ? "Copied JSON!" : "Copy JSON"}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-muted/90 overflow-x-auto max-h-60 leading-tight">
                      {JSON.stringify(selectedLead, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2 border-t border-border/60">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="btn btn-primary text-xs"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        ) : isLinkedIn ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface max-w-3xl w-full rounded-2xl p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge border-sky-500/40 text-sky-400 bg-sky-500/10 text-[10px] font-semibold uppercase tracking-wider">
                      LinkedIn B2B Lead Profile
                    </span>
                    <span className="badge border-brand/40 text-brand bg-brand/10 text-[10px] px-2 py-0.5 font-semibold capitalize">
                      {selectedLead.extra?.seniority || "Founder/CXO"}
                    </span>
                    {(selectedLead.company_size || selectedLead.extra?.company_size) && (
                      <span className="badge border-border text-muted text-[10px] px-2 py-0.5 font-mono">
                        {selectedLead.company_size || selectedLead.extra?.company_size}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-fg mt-1 truncate">
                    {selectedLead.founder_name || selectedLead.decision_makers?.[0]?.name || "Decision Maker"}
                  </h3>

                  <p className="text-xs text-brand font-medium mt-0.5">
                    {selectedLead.extra?.job_title || selectedLead.decision_makers?.[0]?.title || "Executive"} &bull; <span className="text-fg font-semibold">{selectedLead.company_name}</span>
                  </p>

                  <div className="flex items-center gap-3 text-xs text-muted flex-wrap mt-1">
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin size={12} className="text-brand" /> {selectedLead.company_location || selectedLead.city || "Location unavailable"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {(selectedLead.extra?.linkedin_profile_url || selectedLead.decision_makers?.[0]?.profileUrl) && (
                    <a
                      href={
                        (selectedLead.extra?.linkedin_profile_url || selectedLead.decision_makers?.[0]?.profileUrl || "").startsWith("http")
                          ? (selectedLead.extra?.linkedin_profile_url || selectedLead.decision_makers?.[0]?.profileUrl)
                          : `https://${selectedLead.extra?.linkedin_profile_url || selectedLead.decision_makers?.[0]?.profileUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary text-xs !py-1.5 !px-3 inline-flex items-center gap-1.5 shadow-sm"
                      title="Open LinkedIn Profile"
                    >
                      <span>LinkedIn Profile</span>
                      <ExternalLink size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="p-1.5 rounded-xl border border-border text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Section 1: Person Direct Contacts */}
              <div className="space-y-3 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4">
                <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} /> Verified Decision Maker Contacts
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted block text-[11px] mb-1">Direct Verified Email</span>
                    {selectedLead.founder_emails?.length || selectedLead.extra?.founder_email || selectedLead.company_emails?.length ? (
                      <div className="space-y-1 font-mono text-[11px] text-fg">
                        {Array.from(new Set([...(selectedLead.founder_emails || []), ...(selectedLead.company_emails || []), selectedLead.extra?.founder_email].filter(Boolean))).map((em, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Mail size={11} className="text-emerald-400 shrink-0" />
                            <span className="font-semibold text-emerald-300">{em}</span>
                            <span className="badge border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[9px] px-1 py-0">verified</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted italic text-[11px]">Direct email not available</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Direct Phone</span>
                    {selectedLead.founder_phones?.length || selectedLead.company_phones?.length ? (
                      <div className="space-y-1 font-mono text-[11px] text-fg">
                        {Array.from(new Set([...(selectedLead.founder_phones || []), ...(selectedLead.company_phones || [])])).map((ph, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <Phone size={11} className="text-muted shrink-0" />
                            <span>{ph}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted italic text-[11px]">Direct phone not available</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Job Title &amp; Role</span>
                    <span className="font-semibold text-fg">
                      {selectedLead.extra?.job_title || selectedLead.decision_makers?.[0]?.title || "Decision Maker"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Seniority Level</span>
                    <span className="badge border-brand/40 text-brand bg-brand/10 text-[10px] px-2 py-0.5 font-semibold capitalize">
                      {selectedLead.extra?.seniority || "Founder/CXO"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Company Profile */}
              <div className="space-y-3 rounded-2xl border border-border/70 bg-surface-2/40 p-4">
                <h4 className="text-xs font-bold text-fg uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={14} className="text-brand" /> Company Organization
                </h4>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted block text-[11px] mb-1">Company Name</span>
                    <span className="font-semibold text-fg text-sm">{selectedLead.company_name}</span>
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Website</span>
                    {selectedLead.company_website || selectedLead.website ? (
                      <a
                        href={selectedLead.company_website || selectedLead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-2 hover:underline inline-flex items-center gap-1 font-mono text-xs break-all"
                      >
                        <span>{selectedLead.company_website || selectedLead.website}</span>
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="text-muted italic">Website not available</span>
                    )}
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Industry</span>
                    <span className="badge border-brand/30 text-brand bg-brand/5 text-[10px] px-2 py-0.5">
                      {selectedLead.industry || selectedLead.extra?.industry || "B2B / Technology"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Company Size (Employee Count)</span>
                    <span className="badge border-border text-muted text-[10px] px-2 py-0.5 font-mono">
                      {selectedLead.company_size || selectedLead.extra?.company_size || "Not specified"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Headquarters Location</span>
                    <span className="text-fg font-medium">
                      {selectedLead.company_location || selectedLead.city || "Not Available"}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted block text-[11px] mb-1">Company LinkedIn Page</span>
                    {(selectedLead.company_linkedin || selectedLead.extra?.company_linkedin_url) ? (
                      <a
                        href={
                          (selectedLead.company_linkedin || selectedLead.extra?.company_linkedin_url || "").startsWith("http")
                            ? (selectedLead.company_linkedin || selectedLead.extra?.company_linkedin_url)
                            : `https://${selectedLead.company_linkedin || selectedLead.extra?.company_linkedin_url}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        <span>Company LinkedIn Page</span>
                        <ExternalLink size={11} />
                      </a>
                    ) : (
                      <span className="text-muted italic">Not Available</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Collapsible Raw JSON Data */}
              <div className="border border-border/60 rounded-xl overflow-hidden bg-surface-2/30">
                <button
                  type="button"
                  onClick={() => setShowRawJson(!showRawJson)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-muted hover:text-fg hover:bg-surface-2/60 transition-colors cursor-pointer"
                >
                  <span>Raw Apify B2B Lead Record (JSON)</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 ${showRawJson ? "rotate-180" : ""}`} />
                </button>
                {showRawJson && (
                  <div className="p-3 border-t border-border/60 space-y-2 bg-black/40">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(selectedLead, null, 2));
                          setCopiedJson(true);
                          setTimeout(() => setCopiedJson(false), 2000);
                        }}
                        className="btn btn-ghost text-[10px] !py-0.5 !px-2 border border-border"
                      >
                        {copiedJson ? "Copied JSON!" : "Copy JSON"}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono text-muted/90 overflow-x-auto max-h-60 leading-tight">
                      {JSON.stringify(selectedLead, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end pt-2 border-t border-border/60">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="btn btn-primary text-xs"
                >
                  Close Drawer
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface max-w-2xl w-full rounded-xl p-6 border border-border shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="badge border-brand/40 text-brand text-[10px]">25 Field Lead Inspector</span>
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

            {/* Section 0: Meta Ads Intelligence (if available or Meta Ads source) */}
            {(selectedLead.ad_library_url ||
              selectedLead.extra?.ad_library_url ||
              selectedLead.ad_count ||
              selectedLead.extra?.ad_count ||
              isMeta) && (
              <div className="space-y-3 rounded-2xl border border-brand/40 bg-brand/5 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-brand uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={14} /> Meta Ads Intelligence
                  </h4>
                  {(selectedLead.ad_library_url || selectedLead.extra?.ad_library_url) && (
                    <a
                      href={selectedLead.ad_library_url || selectedLead.extra?.ad_library_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary text-[11px] !py-1 !px-2.5 inline-flex items-center gap-1.5"
                    >
                      <span>Open in Meta Ads Library</span>
                      <ExternalLink size={11} />
                    </a>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted block text-[11px]">Active Ad Campaigns</span>
                    <span className="font-semibold text-fg">
                      {selectedLead.ad_count || selectedLead.extra?.ad_count || 1} Active Ads Detected
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block text-[11px]">Publisher Platforms</span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {(selectedLead.platforms || selectedLead.extra?.platforms || ["Facebook", "Instagram"]).map((p: string, idx: number) => (
                        <span key={idx} className="badge border-border text-[10px] px-1.5 py-0.2">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  {(selectedLead.ad_snippet || selectedLead.extra?.ad_snippet) && (
                    <div className="sm:col-span-2">
                      <span className="text-muted block text-[11px]">Ad Copy Snippet</span>
                      <p className="text-fg bg-surface-2 p-2.5 rounded-lg border border-border text-[11px] mt-0.5 leading-relaxed font-mono">
                        {selectedLead.ad_snippet || selectedLead.extra?.ad_snippet}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section: LinkedIn Decision Makers (if available or LinkedIn source) */}
            {(((selectedLead.decision_makers && selectedLead.decision_makers.length > 0) ||
              (selectedLead.extra?.decision_makers && selectedLead.extra.decision_makers.length > 0)) ||
              isLinkedIn) && (
              <div className="space-y-3 rounded-2xl border border-sky-500/40 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <User size={14} /> Verified Decision Makers
                  </h4>
                  {selectedLead.company_size || selectedLead.extra?.company_size ? (
                    <span className="badge border-border text-muted text-[10px] px-2 py-0.5">
                      {selectedLead.company_size || selectedLead.extra?.company_size}
                    </span>
                  ) : null}
                </div>
                {((selectedLead.decision_makers && selectedLead.decision_makers.length > 0)
                  ? selectedLead.decision_makers
                  : selectedLead.extra?.decision_makers || []
                ).length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    {((selectedLead.decision_makers && selectedLead.decision_makers.length > 0)
                      ? selectedLead.decision_makers
                      : selectedLead.extra?.decision_makers || []
                    ).map((dm: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-surface border border-border flex items-center justify-between gap-2 shadow-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-fg text-xs truncate">{dm.name}</div>
                          <div className="text-[11px] text-brand truncate font-medium">{dm.title}</div>
                          {dm.email && (
                            <div className="text-[10px] text-emerald-400 font-mono truncate flex items-center gap-1 mt-0.5">
                              <Mail size={10} className="shrink-0" />
                              <span className="truncate">{dm.email}</span>
                            </div>
                          )}
                          {dm.phone && (
                            <div className="text-[10px] text-muted font-mono truncate flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="shrink-0" />
                              <span className="truncate">{dm.phone}</span>
                            </div>
                          )}
                        </div>
                        {dm.profileUrl && (
                          <a
                            href={dm.profileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost text-[10px] !py-1 !px-2 border border-border inline-flex items-center gap-1 shrink-0 text-muted hover:text-fg"
                          >
                            <span>Profile</span>
                            <ExternalLink size={9} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted text-xs italic">
                    No decision makers matched the selected titles for this company directory.
                  </p>
                )}
              </div>
            )}

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
                {(selectedLead.rating || selectedLead.extra?.rating) ? (
                  <div>
                    <span className="text-muted block text-[11px]">Google Maps Rating & Reviews</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1.5 mt-0.5">
                      ★ {selectedLead.rating || selectedLead.extra?.rating}
                      {(selectedLead.extra?.reviews_count || selectedLead.extra?.user_ratings_total) && (
                        <span className="text-muted text-[11px] font-normal">
                          ({selectedLead.extra?.reviews_count || selectedLead.extra?.user_ratings_total} reviews)
                        </span>
                      )}
                    </span>
                  </div>
                ) : null}
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
                    {selectedLead.company_twitter && (
                      <a href={selectedLead.company_twitter} target="_blank" rel="noreferrer" className="text-neutral-300 hover:underline">
                        X / Twitter
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
                      !selectedLead.company_twitter &&
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
        )
      )}





      {/* Google Sheets Direct OAuth Connect Modal */}
      {showGoogleAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface max-w-lg w-full rounded-xl p-6 border border-border shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-bgSubtle border border-border flex items-center justify-center shrink-0">
                  <GoogleSheetsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-fg">Direct Google Sheets Sync</h3>
                  <p className="text-xs text-muted">Populate leads directly into your Google Drive</p>
                </div>
              </div>
              <button
                onClick={() => setShowGoogleAuthModal(false)}
                className="p-1.5 rounded-lg border border-border text-muted hover:text-fg hover:bg-bgSubtle transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-bgSubtle border border-border text-xs text-muted space-y-2">
              <p className="leading-relaxed">
                Connect your Google Account to create spreadsheets directly inside your Google Drive with all <strong className="text-fg font-semibold">18 columns</strong> automatically populated — zero clipboard copying and zero manual pasting required!
              </p>
            </div>

            {googleAuthStatus?.clientConfigured ? (
              <div className="space-y-3 pt-2">
                <a
                  href="/api/v1/auth/google/start?returnTo=/app/leads/google_maps"
                  className="w-full h-10 px-4 rounded-lg text-xs font-medium bg-primary text-primaryText flex items-center justify-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
                >
                  <GoogleSheetsIcon className="w-4 h-4" />
                  <span>Sign In with Google to Export Directly</span>
                </a>
              </div>
            ) : (
              <form onSubmit={handleSaveGoogleConfig} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-fg">Google OAuth Client ID</label>
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
                  <label className="text-[11px] font-medium text-fg">Google OAuth Client Secret</label>
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
