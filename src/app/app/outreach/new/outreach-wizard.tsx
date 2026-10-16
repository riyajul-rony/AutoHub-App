"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
  Eye,
} from "lucide-react";

interface LeadSearchItem {
  id: string;
  source: string;
  params: {
    keyword?: string;
    location?: string;
  };
  found_count: number;
  enriched_count: number;
}

interface EmailAccountItem {
  id: string;
  label: string;
  from_email: string;
  from_name: string;
  hourly_limit: number;
  status: string;
}

interface Recipient {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  lead_id?: string;
}

const STEP_LABELS = [
  { step: 1, title: "Recipients", icon: Users },
  { step: 2, title: "Senders", icon: Mail },
  { step: 3, title: "Message", icon: Sparkles },
  { step: 4, title: "Safety & Schedule", icon: Clock },
  { step: 5, title: "Review & Launch", icon: CheckCircle2 },
];

export function OutreachWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "custom" ? "custom" : "ai";
  const initialSearchId = searchParams.get("search_id") || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [campaignName, setCampaignName] = useState("Cold Outreach Campaign " + new Date().toLocaleDateString());
  const [mode, setMode] = useState<"ai" | "custom">(initialMode);

  // Step 1: Recipients
  const [searches, setSearches] = useState<LeadSearchItem[]>([]);
  const [selectedSearchId, setSelectedSearchId] = useState<string>(initialSearchId);
  const [recipientSource, setRecipientSource] = useState<"leads" | "manual">("leads");
  const [manualText, setManualText] = useState("");
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Step 2: Senders
  const [accounts, setAccounts] = useState<EmailAccountItem[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Step 3: Message
  const [subjectTemplate, setSubjectTemplate] = useState("Quick question regarding {{company_name|your business}}");
  const [bodyTemplate, setBodyTemplate] = useState(
    "Hi {{first_name|there}},\n\nI was looking at {{website|your company}} and wanted to reach out.\n\nWe help businesses like {{company_name|yours}} streamline customer acquisition and automation.\n\nDo you have 5 minutes for a quick chat this week?\n\nBest regards,\nAlex"
  );
  const [aiGoal, setAiGoal] = useState("Offer local SEO & AI appointment automation to increase high-ticket leads");
  const [aiTone, setAiTone] = useState("Friendly, low-pressure, direct");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");

  // Step 4: Schedule & Safety
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [timezone, setTimezone] = useState("Asia/Dhaka");
  const [jitterMin, setJitterMin] = useState(60);
  const [jitterMax, setJitterMax] = useState(180);
  const [physicalAddress, setPhysicalAddress] = useState("123 Innovation Way, Suite 400, Wilmington, DE 19801");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch initial searches and accounts
  useEffect(() => {
    fetch("/api/v1/leads/searches")
      .then((r) => r.json())
      .then((res) => {
        if (res.data?.searches) {
          setSearches(res.data.searches);
          if (!selectedSearchId && res.data.searches.length > 0) {
            setSelectedSearchId(res.data.searches[0].id);
          }
        }
      })
      .catch(() => {});

    fetch("/api/v1/email-accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAccounts(res.data);
          // Auto-select all active accounts
          const activeIds = res.data.filter((a: any) => a.status === "active").map((a: any) => a.id);
          setSelectedAccountIds(activeIds);
        }
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  // When selectedSearchId changes or recipientSource is leads, fetch leads
  useEffect(() => {
    if (recipientSource === "leads" && selectedSearchId) {
      setLoadingRecipients(true);
      fetch(`/api/v1/leads?search_id=${selectedSearchId}&limit=200`)
        .then((r) => r.json())
        .then((res) => {
          if (res.data?.leads) {
            const mapped: Recipient[] = res.data.leads
              .filter((l: any) => l.email && l.email.includes("@"))
              .map((l: any) => ({
                email: l.email.trim(),
                name: l.founder_name || l.manager_name || "",
                company: l.company_name || "",
                website: l.website || "",
                lead_id: l.id,
              }));
            setRecipients(mapped);
          }
        })
        .finally(() => setLoadingRecipients(false));
    }
  }, [selectedSearchId, recipientSource]);

  // Handle manual input parsing
  const handleParseManual = () => {
    const lines = manualText.split("\n");
    const parsed: Recipient[] = [];
    for (const line of lines) {
      const parts = line.split(",").map((p) => p.trim());
      const email = parts[0]?.toLowerCase();
      if (email && email.includes("@")) {
        parsed.push({
          email,
          name: parts[1] || "",
          company: parts[2] || "",
          website: parts[3] || "",
        });
      }
    }
    setRecipients(parsed);
  };

  // Capacity calculation
  const totalHourlyCapacity = useMemo(() => {
    const selected = accounts.filter((a) => selectedAccountIds.includes(a.id));
    return selected.reduce((sum, a) => sum + (a.hourly_limit || 25), 0);
  }, [accounts, selectedAccountIds]);

  const estimatedHours = useMemo(() => {
    if (totalHourlyCapacity <= 0 || recipients.length <= 0) return 0;
    return (recipients.length / totalHourlyCapacity).toFixed(1);
  }, [recipients.length, totalHourlyCapacity]);

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

  const handleLaunch = async (launchNow: boolean) => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const payload = {
        name: campaignName,
        mode,
        senderAccountIds: selectedAccountIds,
        recipientSource,
        sourceRef: { search_id: selectedSearchId },
        recipients,
        subjectTemplate,
        bodyTemplate,
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
        jitterMinSec: jitterMin,
        jitterMaxSec: jitterMax,
        senderAddressFooter: physicalAddress,
        launchNow,
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

      router.push(`/app/outreach/${data.data.campaign.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An error occurred");
      setSubmitting(false);
    }
  };

  const insertVariable = (varName: string) => {
    setBodyTemplate((prev) => prev + ` {{${varName}}} `);
  };

  return (
    <div className="space-y-8">
      {/* Wizard Header */}
      <div>
        <h1 className="text-3xl font-bold">New Outreach Campaign</h1>
        <p className="mt-1 text-sm text-muted">
          Set up rotating sender accounts, personalized copy, rate limits, and safety buffers.
        </p>
      </div>

      {/* Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {STEP_LABELS.map((s) => {
          const Icon = s.icon;
          const isActive = currentStep === s.step;
          const isDone = currentStep > s.step;
          return (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition text-left cursor-pointer ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : isDone
                  ? "bg-bg-subtle border-border text-text hover:bg-surface-hover"
                  : "bg-surface border-border text-text-muted hover:text-text hover:bg-surface-hover"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <div className="truncate">
                <span className={`block text-[10px] ${isActive ? "text-primary-foreground/75" : "text-text-muted"}`}>{s.step}. Step</span>
                <span className="font-semibold">{s.title}</span>
              </div>
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-accent-red/10 border border-accent-red/30 text-accent-red text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Recipients */}
      {currentStep === 1 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="text-brand" size={20} /> Select Campaign Recipients
            </h2>
            <p className="text-xs text-muted mt-1">
              Choose leads gathered from Google Maps or paste a custom recipient list.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="input w-full"
                placeholder="e.g. Dhaka Dentists Automation Pitch"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecipientSource("leads")}
                className={`btn flex-1 text-xs ${
                  recipientSource === "leads" ? "btn-primary" : "btn-ghost"
                }`}
              >
                Saved Lead Searches
              </button>
              <button
                type="button"
                onClick={() => setRecipientSource("manual")}
                className={`btn flex-1 text-xs ${
                  recipientSource === "manual" ? "btn-primary" : "btn-ghost"
                }`}
              >
                Paste / Manual List
              </button>
            </div>

            {recipientSource === "leads" ? (
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted block">Choose Lead Search Run</label>
                {searches.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-surface/40 border border-border text-center text-xs text-muted">
                    No lead searches recorded yet.{" "}
                    <Link href="/app/leads/google_maps" className="text-brand hover:underline">
                      Run a Google Maps search first
                    </Link>
                  </div>
                ) : (
                  <select
                    value={selectedSearchId}
                    onChange={(e) => setSelectedSearchId(e.target.value)}
                    className="input w-full"
                  >
                    {searches.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.params?.keyword || "Search"} in {s.params?.location || "Area"} (
                        {s.found_count} leads)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted block">
                  Paste Recipients (CSV: email, name, company, website)
                </label>
                <textarea
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="contact@apexdental.com, Dr. Rahim, Apex Dental, apexdental.com&#10;info@smileclinic.bd, Dr. Karim, Smile Clinic, smileclinic.bd"
                  rows={5}
                  className="input w-full font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={handleParseManual}
                  className="btn btn-ghost text-xs"
                >
                  Parse Recipients
                </button>
              </div>
            )}

            {/* Recipient Preview */}
            <div className="border border-border/60 rounded-2xl p-4 bg-surface/30">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold">
                  Valid Recipients Ready:{" "}
                  <strong className="text-brand">{recipients.length}</strong>
                </span>
                {loadingRecipients && <span className="text-muted">Loading leads...</span>}
              </div>

              {recipients.length > 0 ? (
                <div className="max-h-48 overflow-y-auto divide-y divide-border/40 text-xs">
                  {recipients.slice(0, 5).map((r, i) => (
                    <div key={i} className="py-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.email}</div>
                        <div className="text-[11px] text-muted">
                          {r.name || "No Name"} • {r.company || "No Company"}
                        </div>
                      </div>
                      <span className="badge text-[10px] border-accent-green/40 text-accent-green">
                        Ready
                      </span>
                    </div>
                  ))}
                  {recipients.length > 5 && (
                    <div className="pt-2 text-center text-[11px] text-muted italic">
                      + {recipients.length - 5} more recipients
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted py-4 text-center">
                  No recipients with email addresses selected.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              disabled={recipients.length === 0}
              onClick={() => setCurrentStep(2)}
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
            >
              Continue to Senders
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Senders */}
      {currentStep === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Mail className="text-brand" size={20} /> Select Sender Email Accounts
            </h2>
            <p className="text-xs text-muted mt-1">
              Multi-inbox rotation evenly distributes recipients across accounts to protect inbox reputation.
            </p>
          </div>

          {loadingAccounts ? (
            <div className="py-8 text-center text-xs text-muted">Loading email accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface/50 border border-border text-center space-y-3">
              <AlertCircle size={28} className="mx-auto text-accent-amber" />
              <h3 className="font-bold text-sm">No Connected Email Accounts</h3>
              <p className="text-xs text-muted max-w-md mx-auto">
                You must connect at least one SMTP or business email account before sending outreach.
              </p>
              <Link href="/app/outreach/email-accounts" className="btn btn-primary text-xs inline-flex">
                <Plus size={14} /> Connect Email Account
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {accounts.map((acc) => {
                  const isChecked = selectedAccountIds.includes(acc.id);
                  return (
                    <label
                      key={acc.id}
                      className={`p-4 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                        isChecked
                          ? "border-brand bg-brand/5 shadow-sm"
                          : "border-border/60 bg-surface/30 hover:border-border"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAccountIds([...selectedAccountIds, acc.id]);
                          } else {
                            setSelectedAccountIds(selectedAccountIds.filter((id) => id !== acc.id));
                          }
                        }}
                        className="mt-1 accent-brand"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{acc.label || acc.from_email}</div>
                        <div className="text-xs text-muted">{acc.from_email}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="badge text-[10px]">
                            Cap: {acc.hourly_limit || 25}/hr
                          </span>
                          <span className="badge text-[10px] border-accent-green/40 text-accent-green">
                            {acc.status}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Capacity Banner */}
              <div className="rounded-2xl border border-brand/30 bg-brand/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-sm text-foreground">
                    Combined Sending Capacity: {totalHourlyCapacity} emails / hour
                  </div>
                  <div className="text-muted text-[11px] mt-0.5">
                    {selectedAccountIds.length} inboxes rotating with strict 25/hr limit per inbox.
                  </div>
                </div>
                <div className="font-semibold text-brand">
                  Est. Duration: ~{estimatedHours} hours for {recipients.length} leads
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep(1)}
              leftIcon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={selectedAccountIds.length === 0}
              onClick={() => setCurrentStep(3)}
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
            >
              Continue to Message
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Message & Personalization */}
      {currentStep === 3 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-brand" size={20} /> Craft Your Cold Email
            </h2>
            <p className="text-xs text-muted mt-1">
              Choose between automated AI personalization or high-converting custom template variables.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div
              onClick={() => setMode("ai")}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                mode === "ai" ? "border-brand bg-brand/10 shadow-sm" : "border-border/60 bg-surface/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">AI Personalized Message</span>
                <span className="badge border-brand text-brand text-[10px]">Dynamic</span>
              </div>
              <p className="text-xs text-muted mt-2">
                AI generates a completely unique subject & body per lead right before dispatch.
              </p>
            </div>

            <div
              onClick={() => setMode("custom")}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                mode === "custom" ? "border-brand bg-brand/10 shadow-sm" : "border-border/60 bg-surface/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">Custom Template with Fallbacks</span>
                <span className="badge text-[10px]">Controlled</span>
              </div>
              <p className="text-xs text-muted mt-2">
                Use variables like {"{{first_name|there}}"} and {"{{company_name}}"}.
              </p>
            </div>
          </div>

          {mode === "ai" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Your Pitch Offer / Goal
                </label>
                <textarea
                  value={aiGoal}
                  onChange={(e) => setAiGoal(e.target.value)}
                  rows={3}
                  className="input w-full text-xs"
                  placeholder="e.g. Help dentists automate their weekend patient bookings with AI chatbots."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Tone & Voice</label>
                  <input
                    type="text"
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="input w-full text-xs"
                    placeholder="e.g. Friendly, concise, executive"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">AI Model</label>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    className="input w-full text-xs"
                  >
                    <option value="gpt-4o-mini">GPT-4o Mini (Fast & Cost Efficient)</option>
                    <option value="gpt-4o">GPT-4o (Premium Reasoning)</option>
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className="input w-full text-xs font-mono"
                  placeholder="Quick question for {{company_name|your team}}"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted">Email Body Template</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-muted">Insert:</span>
                    {["first_name", "company_name", "website"].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(`${v}|there`)}
                        className="btn btn-ghost !py-0.5 !px-1.5 text-[10px]"
                      >
                        + {v}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  rows={8}
                  className="input w-full text-xs font-mono leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Live Preview Panel */}
          <div className="border border-border/80 rounded-2xl p-5 bg-surface/40 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
              <span className="font-bold flex items-center gap-1.5 text-brand">
                <Eye size={14} /> Live Lead Preview (for {sampleRecipient.company || "Sample Lead"})
              </span>
              <span className="text-muted text-[11px] font-mono">{sampleRecipient.email}</span>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-foreground">
                <span className="text-muted font-normal">Subject: </span>
                {mode === "ai"
                  ? `Quick inquiry regarding ${sampleRecipient.company || "your business"}`
                  : previewSubject}
              </div>
              <div className="text-xs text-muted whitespace-pre-wrap leading-relaxed border-t border-border/30 pt-2 font-sans">
                {mode === "ai"
                  ? `Hi ${sampleRecipient.name || "there"},\n\nI was looking into ${sampleRecipient.company || "your clinic"} and wanted to connect.\n\nWe recently helped businesses like yours boost booking response times significantly. Would you have 5 minutes for a quick chat?\n\nBest,\nAlex`
                  : previewBody}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep(2)}
              leftIcon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep(4)}
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
            >
              Continue to Safety &amp; Schedule
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Safety & Schedule */}
      {currentStep === 4 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Clock className="text-brand" size={20} /> Sending Schedule & Anti-Spam Safety
            </h2>
            <p className="text-xs text-muted mt-1">
              Enforce strict delivery windows, human randomized delays, and compliance headers.
            </p>
          </div>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Start Sending (Hour)
                </label>
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="input w-full text-xs"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00 ({i < 12 ? `${i} AM` : `${i - 12 || 12} PM`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Stop Sending (Hour)
                </label>
                <select
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="input w-full text-xs"
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, "0")}:00 ({i < 12 ? `${i} AM` : `${i - 12 || 12} PM`})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            {/* Random Jitter Delay */}
            <div className="rounded-2xl border border-border/80 p-4 bg-surface/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-accent-green" /> Randomized Jitter Delay
                </span>
                <span className="badge text-[11px] font-mono">
                  {jitterMin}s – {jitterMax}s
                </span>
              </div>
              <p className="text-[11px] text-muted">
                Every email sent from an inbox waits between {jitterMin} and {jitterMax} seconds randomly.
                This prevents email providers (Google/Microsoft) from detecting automated batch spikes.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Min Delay (Sec)</label>
                  <input
                    type="number"
                    min={30}
                    max={120}
                    value={jitterMin}
                    onChange={(e) => setJitterMin(Number(e.target.value))}
                    className="input w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Max Delay (Sec)</label>
                  <input
                    type="number"
                    min={120}
                    max={600}
                    value={jitterMax}
                    onChange={(e) => setJitterMax(Number(e.target.value))}
                    className="input w-full text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Physical Address Footer */}
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">
                Physical Mailing Address (CAN-SPAM Footer Compliance)
              </label>
              <input
                type="text"
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                className="input w-full text-xs"
                placeholder="123 Corporate Blvd, Suite 100, City, Country"
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep(3)}
              leftIcon={<ArrowLeft size={16} />}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={() => setCurrentStep(5)}
              variant="primary"
              rightIcon={<ArrowRight size={16} />}
            >
              Review Campaign
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Launch */}
      {currentStep === 5 && (
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="text-accent-green" size={20} /> Review & Launch Campaign
            </h2>
            <p className="text-xs text-muted mt-1">
              Verify your setup. Emails will automatically begin dispatching within your specified hours.
            </p>
          </div>

          <div className="divide-y divide-border/60 text-xs">
            <div className="py-3 flex justify-between">
              <span className="text-muted">Campaign Name:</span>
              <span className="font-semibold text-foreground">{campaignName}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Total Verified Leads:</span>
              <span className="font-bold text-brand">{recipients.length}</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Rotating Senders:</span>
              <span className="font-semibold">{selectedAccountIds.length} inboxes</span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Hourly Cap:</span>
              <span className="font-mono text-accent-green">
                {totalHourlyCapacity} emails / hour max
              </span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Active Sending Window:</span>
              <span className="font-mono">
                {startHour.toString().padStart(2, "0")}:00 – {endHour.toString().padStart(2, "0")}:00 ({timezone})
              </span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Generation Mode:</span>
              <span className="badge text-[10px]">
                {mode === "ai" ? "AI Personalized" : "Custom Variable Template"}
              </span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">Random Delay Buffer:</span>
              <span className="font-mono">
                {jitterMin}s – {jitterMax}s per email
              </span>
            </div>
            <div className="py-3 flex justify-between">
              <span className="text-muted">One-Click Unsubscribe Header:</span>
              <span className="text-accent-green font-semibold">Enabled (RFC 8058)</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCurrentStep(4)}
              disabled={submitting}
              leftIcon={<ArrowLeft size={16} />}
              className="w-full sm:w-auto"
            >
              Edit Settings
            </Button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => handleLaunch(false)}
                className="flex-1 sm:flex-none"
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                disabled={submitting || recipients.length === 0 || selectedAccountIds.length === 0}
                loading={submitting}
                onClick={() => handleLaunch(true)}
                rightIcon={<Sparkles size={16} />}
                className="flex-1 sm:flex-none"
              >
                Launch Campaign Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
