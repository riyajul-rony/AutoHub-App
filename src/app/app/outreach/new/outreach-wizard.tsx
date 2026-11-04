"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Users,
  Mail,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileSpreadsheet,
  UploadCloud,
  Send,
  Calendar,
  AlertTriangle,
  Tag,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Loader2,
  Check,
  Inbox,
} from "lucide-react";
import { SPEED_PRESETS, SpeedPresetKey } from "@/components/outreach/sending-speed-card";
import { LeadSearchPicker } from "@/components/outreach/lead-search-picker";
import { GoogleSheetImporter } from "@/components/outreach/google-sheet-importer";
import { CsvImporter } from "@/components/outreach/csv-importer";
import {
  ValidationSummaryCard,
  ValidationSummaryData,
  PreviewItemData,
} from "@/components/outreach/validation-summary-card";
import { FollowupStepBuilder, FollowupStepData } from "@/components/outreach/followup-step-builder";
import { AiPreviewApprover, GeneratedPreview } from "@/components/outreach/ai-preview-approver";
import { SpamCheckResult } from "@/server/email/spam-checker";
import { InfoTooltip } from "@/components/outreach/info-tooltip";

interface EmailAccountItem {
  id: string;
  label: string;
  from_email: string;
  from_name: string;
  hourly_limit: number;
  daily_limit?: number;
  effective_daily_limit?: number;
  remainingToday?: number;
  warmup_enabled?: boolean;
  warmup_day?: number;
  provider_id?: string;
  provider?: string;
  imap_host?: string | null;
  has_imap_password?: boolean;
  reply_inbox_account_id?: string | null;
  reply_inbox?: { id: string; label: string; from_email: string } | null;
  has_oauth_token?: boolean;
  min_gap_seconds?: number;
  max_gap_seconds?: number;
  gap_seconds?: number;
  status: string;
}

interface Recipient {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  lead_id?: string;
  vars?: Record<string, any>;
}

const STEP_LABELS = [
  { step: 1, title: "Name & Type", subtitle: "Goal & AI mode", icon: Tag },
  { step: 2, title: "Add Leads", subtitle: "Upload or import", icon: Users },
  { step: 3, title: "Senders & Speed", subtitle: "Inboxes & pacing", icon: Mail },
  { step: 4, title: "Email Content", subtitle: "Subject & copy", icon: FileText },
  { step: 5, title: "Review & Launch", subtitle: "Summary & test", icon: CheckCircle2 },
];

const DRAFT_STORAGE_KEY = "leadreach_outreach_wizard_draft_v2";

export function OutreachWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "custom" ? "custom" : "ai";
  const initialSearchId = searchParams.get("search_id") || "";

  // Core Wizard Step State
  const [currentStep, setCurrentStep] = useState(1);
  const [draftRestored, setDraftRestored] = useState(false);

  // Step 1: Campaign Name & Type
  const [campaignName, setCampaignName] = useState(
    "Cold Outreach Campaign " + new Date().toLocaleDateString()
  );
  const [mode, setMode] = useState<"ai" | "custom">(initialMode);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Advanced Settings
  const [timezone, setTimezone] = useState("Asia/Dhaka");
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [trackingClick, setTrackingClick] = useState(false);
  const [physicalAddress, setPhysicalAddress] = useState(
    "123 Innovation Way, Suite 400, Wilmington, DE 19801"
  );

  // Step 2: Leads & Recipients
  const [recipientSource, setRecipientSource] = useState<"paste" | "leads" | "csv" | "sheet">(
    "leads"
  );
  const [pastedLeadsText, setPastedLeadsText] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [sourceRef, setSourceRef] = useState<Record<string, any>>({});
  const [validationSummary, setValidationSummary] = useState<ValidationSummaryData>({
    total: 0,
    valid: 0,
    duplicates: 0,
    suppressed: 0,
    invalidSyntax: 0,
  });
  const [previewItems, setPreviewItems] = useState<PreviewItemData[]>([]);

  // Step 3: Senders & Speed
  const [accounts, setAccounts] = useState<EmailAccountItem[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  interface AccountAllocState {
    leadCount: number;
    dailyLimit: number;
    minWaitMinutes: number;
    maxWaitMinutes: number;
  }
  const [accountAllocations, setAccountAllocations] = useState<Record<string, AccountAllocState>>({});
  const [presetMode, setPresetMode] = useState<"safe" | "balanced" | "custom">("balanced");

  // Step 4: Email Content
  const [subjectTemplate, setSubjectTemplate] = useState(
    "Quick question regarding {{company_name|your business}}"
  );
  const [bodyTemplate, setBodyTemplate] = useState(
    "Hi {{first_name|there}},\n\nI was looking at {{website|your company}} and wanted to reach out.\n\nWe help businesses like {{company_name|yours}} streamline customer acquisition and automation.\n\nDo you have 5 minutes for a quick chat this week?\n\nBest regards,\nAlex"
  );
  const [aiGoal, setAiGoal] = useState(
    "Offer local SEO & AI appointment automation to increase high-ticket leads"
  );
  const [aiTone, setAiTone] = useState("Friendly, low-pressure, direct");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [followupSteps, setFollowupSteps] = useState<FollowupStepData[]>([]);
  const [previewsApproved, setPreviewsApproved] = useState(false);
  const [aiPreviews, setAiPreviews] = useState<GeneratedPreview[]>([]);

  // Spam checker state
  const [spamResult, setSpamResult] = useState<SpamCheckResult | null>(null);
  const [checkingSpam, setCheckingSpam] = useState(false);

  // Step 5: Test send & Launch states
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acknowledgedNoReplyDetection, setAcknowledgedNoReplyDetection] = useState(false);

  // 1. Restore draft on initial mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.campaignName) setCampaignName(d.campaignName);
        if (d.mode) setMode(d.mode);
        if (Array.isArray(d.recipients) && d.recipients.length > 0) {
          setRecipients(d.recipients);
          setValidationSummary({
            total: d.recipients.length,
            valid: d.recipients.length,
            duplicates: 0,
            suppressed: 0,
            invalidSyntax: 0,
          });
          setPreviewItems(
            d.recipients.slice(0, 15).map((r: any) => ({
              email: r.email,
              name: r.name || "",
              company: r.company || "",
              website: r.website || "",
              status: "ready",
            }))
          );
        }
        if (Array.isArray(d.selectedAccountIds) && d.selectedAccountIds.length > 0) {
          setSelectedAccountIds(d.selectedAccountIds);
        }
        if (d.subjectTemplate) setSubjectTemplate(d.subjectTemplate);
        if (d.bodyTemplate) setBodyTemplate(d.bodyTemplate);
        if (d.aiGoal) setAiGoal(d.aiGoal);
        if (d.aiTone) setAiTone(d.aiTone);
        if (d.timezone) setTimezone(d.timezone);
        setDraftRestored(true);
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  // 2. Auto-save draft on state change
  useEffect(() => {
    try {
      const draftData = {
        campaignName,
        mode,
        recipients,
        selectedAccountIds,
        subjectTemplate,
        bodyTemplate,
        aiGoal,
        aiTone,
        timezone,
        updatedAt: Date.now(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
    } catch {
      // Ignore quota error
    }
  }, [
    campaignName,
    mode,
    recipients,
    selectedAccountIds,
    subjectTemplate,
    bodyTemplate,
    aiGoal,
    aiTone,
    timezone,
  ]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {}
    setCampaignName("Cold Outreach Campaign " + new Date().toLocaleDateString());
    setRecipients([]);
    setValidationSummary({ total: 0, valid: 0, duplicates: 0, suppressed: 0, invalidSyntax: 0 });
    setPreviewItems([]);
    setDraftRestored(false);
  };

  // Fetch accounts on mount
  useEffect(() => {
    fetch("/api/v1/email-accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAccounts(res.data);
          const activeIds = res.data
            .filter((a: any) => a.status === "active")
            .map((a: any) => a.id);
          setSelectedAccountIds((prev) => (prev.length > 0 ? prev : activeIds));
        }
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  // Auto-distribute leads across selected accounts
  useEffect(() => {
    if (selectedAccountIds.length === 0) return;
    const totalLeads = recipients.length;
    const baseShare = Math.floor(totalLeads / selectedAccountIds.length);
    const remainder = totalLeads % selectedAccountIds.length;

    setAccountAllocations((prev) => {
      const next = { ...prev };
      selectedAccountIds.forEach((accId, idx) => {
        const acc = accounts.find((a) => a.id === accId);
        const prevAlloc = prev[accId];
        const assignedLeads = idx === 0 ? baseShare + remainder : baseShare;

        next[accId] = {
          leadCount: prevAlloc !== undefined ? prevAlloc.leadCount : assignedLeads,
          dailyLimit: prevAlloc?.dailyLimit || acc?.daily_limit || 75,
          minWaitMinutes:
            prevAlloc?.minWaitMinutes ||
            Number((((acc?.min_gap_seconds || acc?.gap_seconds || 180)) / 60).toFixed(1)),
          maxWaitMinutes:
            prevAlloc?.maxWaitMinutes ||
            Number((((acc?.max_gap_seconds || 420)) / 60).toFixed(1)),
        };
      });
      return next;
    });
  }, [selectedAccountIds, recipients.length, accounts]);

  // Allocation summary calculation
  const allocationSummary = useMemo(() => {
    const totalLeads = recipients.length;
    const selected = accounts.filter((a) => selectedAccountIds.includes(a.id));
    if (selected.length === 0 || totalLeads === 0) {
      return { totalDaily: 0, todayMax: 0, estimatedDays: 0, todaySends: 0 };
    }

    const totalDaily = selected.reduce((sum, a) => {
      const alloc = accountAllocations[a.id];
      return sum + (alloc?.dailyLimit || a.daily_limit || 75);
    }, 0);

    const todayMax = selected.reduce((sum, a) => {
      const alloc = accountAllocations[a.id];
      const limit = alloc?.dailyLimit || a.daily_limit || 75;
      const rem = a.remainingToday !== undefined ? Math.min(a.remainingToday, limit) : limit;
      return sum + rem;
    }, 0);

    const estimatedDays = totalDaily > 0 ? Math.ceil(totalLeads / totalDaily) : 0;
    const todaySends = Math.min(totalLeads, todayMax);

    return { totalDaily, todayMax, estimatedDays, todaySends };
  }, [recipients.length, selectedAccountIds, accounts, accountAllocations]);

  const applyPresetToAccounts = (presetKey: SpeedPresetKey) => {
    const p = SPEED_PRESETS[presetKey];
    setAccountAllocations((prev) => {
      const next = { ...prev };
      selectedAccountIds.forEach((id) => {
        if (next[id]) {
          next[id] = {
            ...next[id],
            dailyLimit: p.dailyLimit,
            minWaitMinutes: p.minWaitMinutes,
            maxWaitMinutes: p.maxWaitMinutes,
          };
        }
      });
      return next;
    });
  };

  const copyFirstAccountSpeedToAll = () => {
    const firstId = selectedAccountIds[0];
    if (!firstId || !accountAllocations[firstId]) return;
    const ref = accountAllocations[firstId];
    setAccountAllocations((prev) => {
      const next = { ...prev };
      selectedAccountIds.forEach((id) => {
        if (next[id]) {
          next[id] = {
            ...next[id],
            dailyLimit: ref.dailyLimit,
            minWaitMinutes: ref.minWaitMinutes,
            maxWaitMinutes: ref.maxWaitMinutes,
          };
        }
      });
      return next;
    });
  };

  // Sample recipient for live preview
  const sampleRecipient = useMemo(() => {
    return (
      recipients[0] || {
        email: "sarah.connor@cyberdyne.io",
        name: "Sarah Connor",
        company: "Cyberdyne Systems",
        website: "cyberdyne.io",
      }
    );
  }, [recipients]);

  const previewSubject = useMemo(() => {
    return subjectTemplate
      .replace(/\{\{\s*first_name(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.name || "there")
      .replace(/\{\{\s*company_name(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.company || "your business")
      .replace(/\{\{\s*website(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.website || "your website");
  }, [subjectTemplate, sampleRecipient]);

  const previewBody = useMemo(() => {
    return bodyTemplate
      .replace(/\{\{\s*first_name(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.name || "there")
      .replace(/\{\{\s*company_name(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.company || "your company")
      .replace(/\{\{\s*website(?:\|[^}]+)?\s*\}\}/g, sampleRecipient.website || "your website");
  }, [bodyTemplate, sampleRecipient]);

  // Live Spam Deliverability check with debouncing
  useEffect(() => {
    if (mode === "custom") {
      setCheckingSpam(true);
      const timer = setTimeout(() => {
        fetch("/api/v1/outreach/spam-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectTemplate,
            body: bodyTemplate,
          }),
        })
          .then((r) => r.json())
          .then((json) => {
            if (json.data) setSpamResult(json.data);
          })
          .catch(() => {})
          .finally(() => setCheckingSpam(false));
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [subjectTemplate, bodyTemplate, mode]);

  // Validation Callbacks
  const handleLeadsValidated = (result: {
    recipients: any[];
    summary: ValidationSummaryData;
    preview: PreviewItemData[];
    searchId: string;
    searchLabel: string;
  }) => {
    setRecipients(result.recipients);
    setValidationSummary(result.summary);
    setPreviewItems(result.preview);
    setSourceRef({
      search_id: result.searchId,
      search_label: result.searchLabel,
    });
  };

  const handleCsvValidated = (result: {
    recipients: any[];
    summary: ValidationSummaryData;
    preview: PreviewItemData[];
    fileName: string;
  }) => {
    setRecipients(result.recipients);
    setValidationSummary(result.summary);
    setPreviewItems(result.preview);
    setSourceRef({
      file_name: result.fileName,
    });
  };

  const handleSheetValidated = (result: {
    recipients: any[];
    summary: ValidationSummaryData;
    preview: PreviewItemData[];
    sheetTitle: string;
    spreadsheetId: string;
  }) => {
    setRecipients(result.recipients);
    setValidationSummary(result.summary);
    setPreviewItems(result.preview);
    setSourceRef({
      spreadsheet_id: result.spreadsheetId,
      sheet_title: result.sheetTitle,
    });
  };

  // Quick Paste Handler
  const handleProcessPastedText = () => {
    if (!pastedLeadsText.trim()) return;
    const lines = pastedLeadsText.split(/[\r\n]+/);
    const parsed: Recipient[] = [];
    const preview: PreviewItemData[] = [];
    let duplicates = 0;
    let invalidSyntax = 0;
    const seen = new Set<string>();

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const parts = line.split(/[,\t]+/).map((p) => p.trim());
      const email = parts[0];
      const name = parts[1] || "";
      const company = parts[2] || "";

      if (!email || !email.includes("@") || !email.includes(".")) {
        invalidSyntax++;
        continue;
      }
      const lower = email.toLowerCase();
      if (seen.has(lower)) {
        duplicates++;
        continue;
      }
      seen.add(lower);

      parsed.push({ email, name, company });
      preview.push({
        email,
        name,
        company,
        website: "",
        status: "ready",
      });
    }

    setRecipients(parsed);
    setValidationSummary({
      total: lines.length,
      valid: parsed.length,
      duplicates,
      suppressed: 0,
      invalidSyntax,
    });
    setPreviewItems(preview.slice(0, 30));
    setSourceRef({ source: "manual_paste", count: parsed.length });
  };

  // Variable chip inserter
  const insertVariable = (varName: string) => {
    setBodyTemplate((prev) => prev + ` {{${varName}}} `);
  };

  // Step validation checker
  const getStepValidation = (step: number): { valid: boolean; hint?: string } => {
    switch (step) {
      case 1:
        if (!campaignName.trim()) {
          return { valid: false, hint: "Enter a campaign name to continue" };
        }
        return { valid: true };
      case 2:
        if (recipients.length === 0) {
          return { valid: false, hint: "Add at least 1 lead to continue" };
        }
        return { valid: true };
      case 3:
        if (selectedAccountIds.length === 0) {
          return { valid: false, hint: "Select at least 1 sender email account" };
        }
        return { valid: true };
      case 4:
        if (!subjectTemplate.trim()) {
          return { valid: false, hint: "Enter an email subject" };
        }
        if (!bodyTemplate.trim()) {
          return { valid: false, hint: "Write email message body" };
        }
        return { valid: true };
      case 5:
        return { valid: true };
      default:
        return { valid: true };
    }
  };

  const currentStepCheck = getStepValidation(currentStep);

  // Send test email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestSendResult({ ok: false, message: "Please enter a valid email address." });
      return;
    }
    const accountId = selectedAccountIds[0];
    if (!accountId) {
      setTestSendResult({
        ok: false,
        message: "Please select at least one sender email account in Step 3.",
      });
      return;
    }

    setTestSending(true);
    setTestSendResult(null);

    try {
      const res = await fetch("/api/v1/outreach/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId,
          toEmail: testEmailAddress,
          subject: subjectTemplate,
          body: bodyTemplate,
          sampleData: {
            first_name: sampleRecipient.name?.split(" ")[0] || "Sarah",
            company_name: sampleRecipient.company || "Acme Dental",
            website: sampleRecipient.website || "acmedental.com",
          },
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send test email");

      setTestSendResult({ ok: true, message: json.message || "Test email dispatched successfully!" });
    } catch (err: any) {
      setTestSendResult({ ok: false, message: err.message || "Failed to send test email." });
    } finally {
      setTestSending(false);
    }
  };

  // Launch campaign
  const handleLaunch = async (launchNow: boolean) => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        name: campaignName,
        mode,
        senderAccountIds: selectedAccountIds,
        recipientSource,
        sourceRef,
        recipients,
        subjectTemplate,
        bodyTemplate,
        steps: followupSteps,
        presetMode,
        daysOfWeek,
        trackingOpen,
        trackingClick,
        previewApproved: mode === "ai" ? previewsApproved : true,
        aiConfig: {
          goalOrOffer: aiGoal,
          tone: aiTone,
          textModel: aiModel,
        },
        sendWindow: {
          startHour,
          endHour,
        },
        timezone,
        jitterMinSec: 180,
        jitterMaxSec: 420,
        senderAddressFooter: physicalAddress,
        launchNow,
        accountAllocations: selectedAccountIds.map((id) => ({
          accountId: id,
          leadCount:
            accountAllocations[id]?.leadCount ??
            Math.floor(recipients.length / selectedAccountIds.length) ??
            0,
          dailyLimit: accountAllocations[id]?.dailyLimit,
          minWaitMinutes: accountAllocations[id]?.minWaitMinutes,
          maxWaitMinutes: accountAllocations[id]?.maxWaitMinutes,
        })),
      };

      const res = await fetch("/api/v1/outreach/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create campaign");
      }

      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch {}

      router.push(`/app/outreach/${data.data.campaign.id}`);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : "An error occurred";
      const sanitized =
        raw.includes("prisma") ||
        raw.includes("invocation") ||
        raw.includes("SQL") ||
        raw.includes("argument") ||
        raw.includes("Expected RecipientSource")
          ? "We couldn't launch your campaign. Please try again."
          : raw;
      setErrorMsg(sanitized);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Draft Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg">New Outreach Campaign</h1>
          <p className="text-xs text-muted mt-0.5">
            5 simple steps to safely launch multi-inbox cold email campaigns.
          </p>
        </div>

        {draftRestored && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-bgSubtle border border-border text-xs text-muted">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
              <Check size={13} /> Draft auto-saved
            </span>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-muted hover:text-danger flex items-center gap-1 transition-colors"
              title="Discard draft and start fresh"
            >
              <RotateCcw size={12} /> Clear
            </button>
          </div>
        )}
      </div>

      {/* Top Progress Bar & Stepper Tabs */}
      <div className="space-y-3">
        {/* Visual Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="font-semibold text-fg">
              Step {currentStep} of 5: {STEP_LABELS[currentStep - 1].title}
            </span>
            <span>{Math.round((currentStep / 5) * 100)}% Completed</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* 5 Stepper Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {STEP_LABELS.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.step;
            const isDone = currentStep > s.step;
            return (
              <button
                key={s.step}
                type="button"
                id={`wizard-step-${s.step}`}
                onClick={() => {
                  if (s.step < currentStep || currentStepCheck.valid) {
                    setCurrentStep(s.step);
                  }
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition text-left cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : isDone
                    ? "bg-bgSubtle border-border text-fg hover:bg-surface"
                    : "bg-surface border-border text-muted hover:text-fg hover:bg-bgSubtle"
                }`}
              >
                <Icon size={16} className="shrink-0" />
                <div className="truncate">
                  <span
                    className={`block text-[10px] uppercase font-mono ${
                      isActive ? "text-primary-foreground/75" : "text-muted"
                    }`}
                  >
                    Step {s.step}
                  </span>
                  <span className="font-semibold">{s.title}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP 1: CAMPAIGN NAME & TYPE                               */}
      {/* ========================================================== */}
      {currentStep === 1 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
              <Tag className="text-primary" size={20} /> Step 1: Campaign Name &amp; Message Type
            </h2>
            <p className="text-xs text-muted mt-1">
              Give your campaign a memorable name and choose how messages should be personalized.
            </p>
          </div>

          <div className="space-y-5 max-w-2xl">
            {/* Campaign Name */}
            <div>
              <label className="text-xs font-semibold text-fg block mb-1.5">
                Campaign Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-border bg-bgSubtle text-fg placeholder:text-muted focus:outline-hidden focus:border-primary"
                placeholder="e.g. Q4 London Agency Outreach"
              />
            </div>

            {/* Mode Selection Cards */}
            <div>
              <label className="text-xs font-semibold text-fg block mb-2">
                Choose Message Type
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setMode("ai")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === "ai"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-bgSubtle/40 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Sparkles size={16} />
                    </span>
                    <Badge variant={mode === "ai" ? "accent" : "neutral"} size="sm">
                      Recommended
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-fg mt-3">AI Personalized Message</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Lead Reach AI reads each lead&apos;s website, industry, and company to generate unique high-converting opening lines.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("custom")}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    mode === "custom"
                      ? "border-primary bg-primary/5 shadow-xs"
                      : "border-border bg-bgSubtle/40 hover:border-border/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-bgSubtle border border-border text-fg">
                      <FileText size={16} />
                    </span>
                    <Badge variant="neutral" size="sm">
                      Standard
                    </Badge>
                  </div>
                  <h3 className="font-bold text-sm text-fg mt-3">Regular Template Copy</h3>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    Send your own proven message copy with dynamic merge tags like <code className="font-mono text-fg bg-bgSubtle px-1 py-0.5 rounded">{"{{first_name}}"}</code> and <code className="font-mono text-fg bg-bgSubtle px-1 py-0.5 rounded">{"{{company_name}}"}</code>.
                  </p>
                </button>
              </div>
            </div>

            {/* Collapsible Advanced Settings */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
              >
                <span>Advanced sending schedule &amp; compliance settings</span>
                {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {isAdvancedOpen && (
                <div className="mt-3 p-4 rounded-xl border border-border bg-bgSubtle space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs font-medium text-fg">Timezone</label>
                        <InfoTooltip
                          title="Local Timezone Matching"
                          content="Sends emails according to your prospect's local timezone so messages arrive at the top of their inbox during active work hours."
                        />
                      </div>
                      <input
                        type="text"
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-fg"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <label className="text-xs font-medium text-fg">
                          Sending Window (Hours)
                        </label>
                        <InfoTooltip
                          title="Business Hours Window"
                          content="Emails will only be dispatched between these hours (e.g. 9 AM - 6 PM) to mimic genuine human work schedules."
                        />
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={startHour}
                          onChange={(e) => setStartHour(Number(e.target.value))}
                          className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-fg text-center"
                        />
                        <span>to</span>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={endHour}
                          onChange={(e) => setEndHour(Number(e.target.value))}
                          className="w-16 px-2 py-1.5 rounded-lg border border-border bg-surface text-fg text-center"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <label className="text-xs font-medium text-fg">
                        Physical Mailing Address (CAN-SPAM Footer)
                      </label>
                      <InfoTooltip
                        title="Compliance Footer"
                        content="Required by international email compliance laws (CAN-SPAM & GDPR). Lead Reach AI automatically appends a subtle address and one-click unsubscribe link."
                      />
                    </div>
                    <input
                      type="text"
                      value={physicalAddress}
                      onChange={(e) => setPhysicalAddress(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-fg"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Step 1 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Link href="/app/outreach">
              <Button variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
                Cancel
              </Button>
            </Link>

            <div className="flex items-center gap-3">
              {!currentStepCheck.valid && (
                <span className="text-xs text-amber-500 font-medium">
                  {currentStepCheck.hint}
                </span>
              )}
              <Button
                type="button"
                id="btn-next-step-1"
                disabled={!currentStepCheck.valid}
                onClick={() => setCurrentStep(2)}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
              >
                Continue to Leads
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP 2: ADD LEADS                                          */}
      {/* ========================================================== */}
      {currentStep === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
                <Users className="text-primary" size={20} /> Step 2: Add Campaign Leads
              </h2>
              <p className="text-xs text-muted mt-1">
                Choose how you want to provide your recipient list. All leads are automatically deduplicated.
              </p>
            </div>

            {recipients.length > 0 && (
              <Badge variant="success" size="md" className="font-mono">
                {recipients.length} Leads Ready
              </Badge>
            )}
          </div>

          <div className="space-y-4">
            {/* 3 Lead Source Tabs */}
            <div className="flex gap-2 p-1.5 rounded-xl bg-bgSubtle border border-border">
              <button
                type="button"
                id="lead-source-leads"
                onClick={() => setRecipientSource("leads")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  recipientSource === "leads"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                Lead Reach AI Scraper Leads
              </button>

              <button
                type="button"
                id="lead-source-csv"
                onClick={() => setRecipientSource("csv")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  recipientSource === "csv"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                <UploadCloud className="inline-block w-3.5 h-3.5 mr-1" /> Upload CSV
              </button>

              <button
                type="button"
                id="lead-source-paste"
                onClick={() => setRecipientSource("paste")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                  recipientSource === "paste"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                Paste Emails / Text
              </button>

              <button
                type="button"
                id="lead-source-sheet"
                onClick={() => setRecipientSource("sheet")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors hidden md:block ${
                  recipientSource === "sheet"
                    ? "bg-surface text-fg shadow-xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                <FileSpreadsheet className="inline-block w-3.5 h-3.5 mr-1" /> Google Sheets
              </button>
            </div>

            {/* Active Source Content */}
            {recipientSource === "leads" && (
              <LeadSearchPicker
                initialSearchId={initialSearchId}
                onValidated={handleLeadsValidated}
              />
            )}

            {recipientSource === "csv" && (
              <CsvImporter onValidated={handleCsvValidated} />
            )}

            {recipientSource === "sheet" && (
              <GoogleSheetImporter onValidated={handleSheetValidated} />
            )}

            {recipientSource === "paste" && (
              <div className="p-4 rounded-xl border border-border bg-bgSubtle space-y-3">
                <div>
                  <label className="text-xs font-semibold text-fg block mb-1">
                    Paste emails list (one per line, optionally with Name and Company)
                  </label>
                  <p className="text-[11px] text-muted mb-2">
                    Format: <code className="font-mono text-fg bg-surface px-1 py-0.5 rounded">email@domain.com, John Doe, Acme Corp</code> or just <code className="font-mono text-fg bg-surface px-1 py-0.5 rounded">email@domain.com</code>
                  </p>
                  <textarea
                    rows={5}
                    value={pastedLeadsText}
                    onChange={(e) => setPastedLeadsText(e.target.value)}
                    placeholder="sarah@dentalpro.com, Sarah Connor, Dental Pro&#10;john@techcorp.io, John Doe, Tech Corp"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-fg font-mono placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleProcessPastedText}
                  disabled={!pastedLeadsText.trim()}
                  icon={<Plus size={14} />}
                >
                  Process &amp; Validate Leads
                </Button>
              </div>
            )}

            {/* Validation Summary & Preview Table */}
            {recipients.length > 0 && (
              <ValidationSummaryCard
                summary={validationSummary}
                preview={previewItems}
              />
            )}
          </div>

          {/* Step 2 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(1)}
              icon={<ArrowLeft size={14} />}
            >
              Back to Name
            </Button>

            <div className="flex items-center gap-3">
              {!currentStepCheck.valid && (
                <span className="text-xs text-amber-500 font-medium">
                  {currentStepCheck.hint}
                </span>
              )}
              <Button
                type="button"
                id="btn-next-step-2"
                disabled={!currentStepCheck.valid}
                onClick={() => setCurrentStep(3)}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
              >
                Continue to Senders &amp; Speed
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP 3: SENDERS & SPEED ALLOCATION (PHASE A INTEGRATION)  */}
      {/* ========================================================== */}
      {currentStep === 3 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
              <Mail className="text-primary" size={20} /> Step 3: Sender Accounts &amp; Sending Speed
            </h2>
            <p className="text-xs text-muted mt-1">
              Select which sender inboxes to rotate and set random human-like wait delays.
            </p>
          </div>

          {loadingAccounts ? (
            <div className="py-8 text-center text-xs text-muted">Loading email accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="p-6 rounded-xl bg-bgSubtle border border-border text-center space-y-3">
              <AlertCircle size={28} className="mx-auto text-amber-500" />
              <h3 className="font-semibold text-sm text-fg">No Email Inboxes Connected</h3>
              <p className="text-xs text-muted max-w-sm mx-auto">
                You must connect at least one business email or Gmail inbox before cold dispatches can begin.
              </p>
              <Link href="/app/outreach/email-accounts">
                <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                  Connect Email Account
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Speed Preset Quick Bar */}
              <div className="p-3.5 rounded-xl border border-border bg-bgSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-fg">One-Click Speed Presets</div>
                  <div className="text-[11px] text-muted">
                    Apply recommended wait intervals and caps across all selected accounts.
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyPresetToAccounts("safe")}
                    className="text-xs"
                  >
                    🛡️ Safe (5–10m)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyPresetToAccounts("balanced")}
                    className="text-xs"
                  >
                    ⚖️ Balanced (3–6m)
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => applyPresetToAccounts("fast")}
                    className="text-xs"
                  >
                    ⚡ Fast (2.5–4m)
                  </Button>
                  {selectedAccountIds.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={copyFirstAccountSpeedToAll}
                      className="text-xs"
                    >
                      Copy #1 to all
                    </Button>
                  )}
                </div>
              </div>

              {/* Per-Account Allocation & Speed Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-bgSubtle border-b border-border text-xs font-semibold text-fg flex items-center justify-between">
                  <span>Selected Senders ({selectedAccountIds.length} of {accounts.length})</span>
                  <span>Target: {recipients.length} total leads</span>
                </div>

                <div className="divide-y divide-border">
                  {accounts.map((acc) => {
                    const isSelected = selectedAccountIds.includes(acc.id);
                    const alloc = accountAllocations[acc.id] || {
                      leadCount: 0,
                      dailyLimit: acc.daily_limit || 75,
                      minWaitMinutes: 3,
                      maxWaitMinutes: 6,
                    };
                    const hourlyMax = Math.floor(60 / Math.max(0.1, alloc.minWaitMinutes || 3));

                    return (
                      <div
                        key={acc.id}
                        className={`p-4 transition-colors ${
                          isSelected ? "bg-surface" : "bg-bgSubtle/30 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          {/* Account Label & Checkbox */}
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAccountIds((prev) => [...prev, acc.id]);
                                } else {
                                  setSelectedAccountIds((prev) => prev.filter((id) => id !== acc.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            />
                            <div>
                              <div className="text-xs font-semibold text-fg">{acc.label}</div>
                              <div className="text-[11px] text-muted font-mono">{acc.from_email}</div>
                            </div>
                          </div>

                          {/* Allocation Controls */}
                          {isSelected && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center text-xs">
                              {/* Leads Assigned Stepper */}
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted uppercase font-bold block">
                                  Leads
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAccountAllocations((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...alloc,
                                          leadCount: Math.max(0, alloc.leadCount - 10),
                                        },
                                      }))
                                    }
                                    className="px-2 py-0.5 rounded border border-border bg-bgSubtle hover:bg-surface text-fg font-mono"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={0}
                                    value={alloc.leadCount}
                                    onChange={(e) =>
                                      setAccountAllocations((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...alloc,
                                          leadCount: Math.max(0, parseInt(e.target.value, 10) || 0),
                                        },
                                      }))
                                    }
                                    className="w-14 text-center font-mono py-1 rounded border border-border bg-bgSubtle text-fg text-xs"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setAccountAllocations((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...alloc,
                                          leadCount: alloc.leadCount + 10,
                                        },
                                      }))
                                    }
                                    className="px-2 py-0.5 rounded border border-border bg-bgSubtle hover:bg-surface text-fg font-mono"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>

                              {/* Daily Limit */}
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted uppercase font-bold block">
                                  Daily Cap
                                </span>
                                <input
                                  type="number"
                                  min={5}
                                  max={500}
                                  value={alloc.dailyLimit}
                                  onChange={(e) =>
                                    setAccountAllocations((prev) => ({
                                      ...prev,
                                      [acc.id]: {
                                        ...alloc,
                                        dailyLimit: Math.max(5, parseInt(e.target.value, 10) || 5),
                                      },
                                    }))
                                  }
                                  className="w-20 font-mono py-1 px-2 rounded border border-border bg-bgSubtle text-fg text-xs"
                                />
                              </div>

                              {/* Wait Gap Range */}
                              <div className="space-y-1">
                                <span className="text-[10px] text-muted uppercase font-bold block">
                                  Wait Range
                                </span>
                                <div className="flex items-center gap-1 font-mono text-xs">
                                  <input
                                    type="number"
                                    step={0.5}
                                    min={0.5}
                                    max={60}
                                    value={alloc.minWaitMinutes}
                                    onChange={(e) =>
                                      setAccountAllocations((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...alloc,
                                          minWaitMinutes: Math.max(0.5, parseFloat(e.target.value) || 0.5),
                                        },
                                      }))
                                    }
                                    className="w-12 py-1 px-1 text-center rounded border border-border bg-bgSubtle text-fg"
                                  />
                                  <span>–</span>
                                  <input
                                    type="number"
                                    step={0.5}
                                    min={alloc.minWaitMinutes}
                                    max={60}
                                    value={alloc.maxWaitMinutes}
                                    onChange={(e) =>
                                      setAccountAllocations((prev) => ({
                                        ...prev,
                                        [acc.id]: {
                                          ...alloc,
                                          maxWaitMinutes: Math.max(
                                            alloc.minWaitMinutes,
                                            parseFloat(e.target.value) || alloc.minWaitMinutes
                                          ),
                                        },
                                      }))
                                    }
                                    className="w-12 py-1 px-1 text-center rounded border border-border bg-bgSubtle text-fg"
                                  />
                                  <span className="text-muted text-[11px]">m</span>
                                </div>
                              </div>

                              {/* Max Speed */}
                              <div className="space-y-1 text-right sm:text-left">
                                <span className="text-[10px] text-muted uppercase font-bold block">
                                  Hourly Speed
                                </span>
                                <span className="text-xs font-semibold text-fg">
                                  ~{hourlyMax} / hr
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Prominent Live Summary Banner */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-primary flex items-center gap-1.5">
                    <CheckCircle2 size={15} />
                    <span>Live Campaign Schedule Estimate</span>
                  </div>
                  <p className="text-fg leading-relaxed">
                    At this rate, sending to <strong>{recipients.length}</strong> leads will take approximately{" "}
                    <strong>{allocationSummary.estimatedDays} {allocationSummary.estimatedDays === 1 ? "day" : "days"}</strong>. Today,{" "}
                    <strong>{allocationSummary.todaySends}</strong> emails will be sent.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-lg font-bold font-mono text-fg">
                    ~{allocationSummary.totalDaily} / day
                  </div>
                  <span className="text-[11px] text-muted">Across selected inboxes</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 3 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(2)}
              icon={<ArrowLeft size={14} />}
            >
              Back to Leads
            </Button>

            <div className="flex items-center gap-3">
              {!currentStepCheck.valid && (
                <span className="text-xs text-amber-500 font-medium">
                  {currentStepCheck.hint}
                </span>
              )}
              <Button
                type="button"
                id="btn-next-step-3"
                disabled={!currentStepCheck.valid}
                onClick={() => setCurrentStep(4)}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
              >
                Continue to Email Content
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP 4: EMAIL CONTENT & AI COPY                           */}
      {/* ========================================================== */}
      {currentStep === 4 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
              <FileText className="text-primary" size={20} /> Step 4: Email Content &amp; Copy
            </h2>
            <p className="text-xs text-muted mt-1">
              {mode === "ai"
                ? "Configure the AI prompt and sample message. The AI will customize the opening line for each prospect."
                : "Write your outreach message template. Click variable chips below to insert merge tags."}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Subject & Body Editor */}
            <div className="space-y-4">
              {/* Subject */}
              <div>
                <label className="text-xs font-semibold text-fg block mb-1">
                  Subject Line <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bgSubtle text-fg placeholder:text-muted focus:outline-hidden focus:border-primary"
                  placeholder="e.g. Quick question regarding {{company_name}}"
                />
              </div>

              {/* Variable Chips Toolbar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 text-[11px] text-muted">
                  <span>Insert tag:</span>
                  <InfoTooltip
                    title="Merge Tags with Fallbacks"
                    content="Click to insert personalized prospect data. You can set fallback values like {{first_name|there}} which will print 'there' if the lead has no first name."
                  />
                </div>
                {["first_name", "company_name", "website", "city"].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-bgSubtle border border-border text-fg hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    + {`{{${v}}}`}
                  </button>
                ))}
              </div>

              {/* Email Body */}
              <div>
                <label className="text-xs font-semibold text-fg block mb-1">
                  Message Body <span className="text-danger">*</span>
                </label>
                <textarea
                  rows={8}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-bgSubtle text-fg font-sans leading-relaxed placeholder:text-muted focus:outline-hidden focus:border-primary"
                  placeholder="Write your email copy here..."
                />
              </div>

              {/* AI Prompt / Goal if AI mode is active */}
              {mode === "ai" && (
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Sparkles size={14} />
                    <span>AI Personalization Prompt</span>
                  </div>
                  <textarea
                    rows={2}
                    value={aiGoal}
                    onChange={(e) => setAiGoal(e.target.value)}
                    placeholder="e.g. Compliment their recent portfolio work and offer custom appointment automation"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-surface text-fg focus:outline-hidden focus:border-primary"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted">Tone:</span>
                    <input
                      type="text"
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value)}
                      className="px-2 py-1 text-xs rounded border border-border bg-surface text-fg flex-1"
                    />
                  </div>
                </div>
              )}

              {/* Collapsible Follow-up Sequences Accordion */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setIsFollowupOpen(!isFollowupOpen)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-fg transition-colors"
                >
                  <span>Automated Follow-up Sequences (Optional)</span>
                  {isFollowupOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>

                {isFollowupOpen && (
                  <div className="mt-3 p-4 rounded-xl border border-border bg-bgSubtle space-y-3">
                    <FollowupStepBuilder
                      steps={followupSteps}
                      onChange={setFollowupSteps}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Live Prospect Preview & Spam Checker */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-bgSubtle p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-muted border-b border-border pb-2">
                  <span className="font-semibold text-fg">Live Preview for Lead #1</span>
                  <span className="text-[11px] font-mono">{sampleRecipient.email}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-muted">Subject: </span>
                    <strong className="text-fg">{previewSubject}</strong>
                  </div>
                  <div className="p-3.5 rounded-lg border border-border bg-surface text-fg leading-relaxed whitespace-pre-wrap font-sans text-xs">
                    {previewBody}
                  </div>
                </div>
              </div>

              {/* Spam Check Score Badge */}
              {mode === "custom" && (
                <div className="p-3.5 rounded-xl border border-border bg-surface flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck
                      size={16}
                      className={
                        spamResult && spamResult.score > 2 ? "text-amber-500" : "text-emerald-500"
                      }
                    />
                    <div>
                      <div className="font-semibold text-fg">Deliverability Check</div>
                      <div className="text-[11px] text-muted">
                        {checkingSpam
                          ? "Analyzing deliverability score..."
                          : spamResult
                          ? `Risk Score: ${spamResult.score}/10 (${spamResult.level} risk)`
                          : "Subject and body verified for inboxing"}
                      </div>
                    </div>
                  </div>

                  {spamResult && (
                    <Badge
                      variant={spamResult.score > 2 ? "warning" : "success"}
                      size="sm"
                    >
                      {spamResult.score > 2 ? "Caution" : "High Inboxing"}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Step 4 Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(3)}
              icon={<ArrowLeft size={14} />}
            >
              Back to Senders
            </Button>

            <div className="flex items-center gap-3">
              {!currentStepCheck.valid && (
                <span className="text-xs text-amber-500 font-medium">
                  {currentStepCheck.hint}
                </span>
              )}
              <Button
                type="button"
                id="btn-next-step-4"
                disabled={!currentStepCheck.valid}
                onClick={() => setCurrentStep(5)}
                variant="primary"
                size="md"
                rightIcon={<ArrowRight size={16} />}
              >
                Continue to Review &amp; Launch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* STEP 5: REVIEW & LAUNCH (PLAIN-LANGUAGE SUMMARY & TEST)    */}
      {/* ========================================================== */}
      {currentStep === 5 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2 text-fg">
              <CheckCircle2 className="text-emerald-500" size={20} /> Step 5: Review &amp; Launch
            </h2>
            <p className="text-xs text-muted mt-1">
              Everything is ready. Review your campaign parameters or send a test email before launching dispatches.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Review Cards */}
            <div className="lg:col-span-2 space-y-4">
              {/* Summary Overview */}
              <div className="rounded-xl border border-border bg-bgSubtle p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-fg">{campaignName}</h3>
                    <p className="text-xs text-muted">
                      {mode === "ai" ? "AI Personalized Icebreaker" : "Standard Template Copy"}
                    </p>
                  </div>
                  <Badge variant={mode === "ai" ? "accent" : "neutral"} size="sm">
                    {mode === "ai" ? "AI Powered" : "Template"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-muted uppercase font-bold block">
                      Total Leads
                    </span>
                    <strong className="text-base text-fg">{recipients.length}</strong>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-muted uppercase font-bold block">
                      Senders Rotating
                    </span>
                    <strong className="text-base text-fg">{selectedAccountIds.length} Inboxes</strong>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-muted uppercase font-bold block">
                      Daily Dispatches
                    </span>
                    <strong className="text-base text-fg">~{allocationSummary.totalDaily} / day</strong>
                  </div>

                  <div className="p-3 rounded-lg border border-border bg-surface">
                    <span className="text-[10px] text-muted uppercase font-bold block">
                      Estimated Duration
                    </span>
                    <strong className="text-base text-fg">
                      ~{allocationSummary.estimatedDays} Days
                    </strong>
                  </div>
                </div>

                {/* Safety Protections Banner */}
                <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span>Lead Reach AI Safety Protections Active</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    • 25/hr maximum account rate limit hard cap enforced.
                    <br />• Human-like random intervals between 3 to 7 minutes per sender inbox.
                    <br />• IMAP Stop-On-Reply protection automatically halts followups when a prospect responds.
                  </p>
                </div>
              </div>

              {/* Email Content Snippet */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-2 text-xs">
                <span className="font-semibold text-fg">Email Message Preview:</span>
                <div className="text-muted">
                  <strong>Subject: </strong> {previewSubject}
                </div>
                <div className="p-3 rounded-lg border border-border bg-bgSubtle whitespace-pre-wrap font-sans text-xs">
                  {previewBody}
                </div>
              </div>

              {/* Reply Detection & Follow-up Warnings */}
              {(() => {
                const selectedAccountsList = accounts.filter((a) => selectedAccountIds.includes(a.id));
                const accountsWithoutReplyDetection = selectedAccountsList.filter((a) => {
                  const hasDirect =
                    a.provider === "gmail_api" ||
                    a.has_oauth_token ||
                    Boolean(a.imap_host && a.has_imap_password);
                  const hasLinked = Boolean(a.reply_inbox_account_id || a.reply_inbox);
                  return !hasDirect && !hasLinked;
                });
                const hasNoReplyDetection = accountsWithoutReplyDetection.length > 0;
                const hasFollowups = followupSteps.length > 0;

                return (
                  <>
                    {hasNoReplyDetection && hasFollowups && (
                      <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs space-y-3 text-amber-900 dark:text-amber-200">
                        <div className="flex items-start gap-2.5">
                          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <div className="font-bold text-sm text-amber-800 dark:text-amber-300">
                              Replies won&apos;t be detected, so people who reply may still get follow-ups.
                            </div>
                            <p className="text-[11px] text-muted leading-relaxed">
                              The selected sender inbox (
                              <strong className="text-fg">
                                {accountsWithoutReplyDetection.map((a) => a.from_email).join(", ")}
                              </strong>
                              ) does not have IMAP or a connected Reply Inbox. Because incoming replies cannot be detected, follow-up emails will continue sending even if a lead responds.
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setFollowupSteps([]);
                              setIsFollowupOpen(false);
                            }}
                            className="text-xs shrink-0"
                          >
                            Turn off follow-ups for this campaign
                          </Button>

                          <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-medium text-fg">
                            <input
                              type="checkbox"
                              checked={acknowledgedNoReplyDetection}
                              onChange={(e) => setAcknowledgedNoReplyDetection(e.target.checked)}
                              className="rounded h-4 w-4 text-amber-600 cursor-pointer"
                            />
                            <span>I understand the risk and want to proceed with follow-ups anyway</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {hasNoReplyDetection && (
                      <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 text-xs flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>⚠ Bounce detection is unavailable for inboxes without IMAP; undelivered emails cannot be automatically marked as bounced.</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Right Column: Send Test & Launch Box */}
            <div className="space-y-4">
              {/* Send Test Email Card */}
              <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                <div className="text-xs font-semibold text-fg flex items-center gap-1.5">
                  <Send size={13} className="text-primary" />
                  <span>Send a Test Email</span>
                </div>
                <p className="text-[11px] text-muted leading-relaxed">
                  Send a sample of this email to your personal inbox to verify formatting and spam filtering.
                </p>

                <div className="space-y-2">
                  <input
                    type="email"
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    placeholder="your-email@gmail.com"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-bgSubtle text-fg placeholder:text-muted focus:outline-hidden focus:border-primary"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleSendTestEmail}
                    disabled={testSending || !testEmailAddress}
                    icon={testSending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                    className="w-full"
                  >
                    {testSending ? "Sending Test..." : "Send Test Email"}
                  </Button>
                </div>

                {testSendResult && (
                  <div
                    className={`p-2.5 rounded-lg text-[11px] ${
                      testSendResult.ok
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-danger/10 text-danger border border-danger/20"
                    }`}
                  >
                    {testSendResult.message}
                  </div>
                )}
              </div>

              {/* Big Launch Buttons */}
              {(() => {
                const selectedAccountsList = accounts.filter((a) => selectedAccountIds.includes(a.id));
                const accountsWithoutReplyDetection = selectedAccountsList.filter((a) => {
                  const hasDirect =
                    a.provider === "gmail_api" ||
                    a.has_oauth_token ||
                    Boolean(a.imap_host && a.has_imap_password);
                  const hasLinked = Boolean(a.reply_inbox_account_id || a.reply_inbox);
                  return !hasDirect && !hasLinked;
                });
                const hasNoReplyDetection = accountsWithoutReplyDetection.length > 0;
                const hasFollowups = followupSteps.length > 0;
                const isLaunchBlocked = hasNoReplyDetection && hasFollowups && !acknowledgedNoReplyDetection;

                return (
                  <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                    <Button
                      type="button"
                      id="btn-launch-campaign"
                      variant="primary"
                      size="lg"
                      onClick={() => handleLaunch(true)}
                      disabled={submitting || isLaunchBlocked}
                      icon={submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                      className="w-full justify-center"
                    >
                      {submitting ? "Launching..." : "Launch Campaign Now"}
                    </Button>

                    {isLaunchBlocked && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 text-center font-medium leading-relaxed">
                        Please confirm the follow-up reply risk above or click &quot;Turn off follow-ups&quot; to enable launching.
                      </p>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      onClick={() => handleLaunch(false)}
                      disabled={submitting}
                      className="w-full justify-center text-xs"
                    >
                      Save as Draft (Don&apos;t Launch)
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Step 5 Back Action */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setCurrentStep(4)}
              icon={<ArrowLeft size={14} />}
            >
              Back to Email Content
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
