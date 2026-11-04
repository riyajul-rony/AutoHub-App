"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  Save,
  Wrench,
  UserPlus,
  Sliders,
  Shield,
  Loader2,
  Radio,
  Lock,
  Zap,
  Mail,
} from "lucide-react";
import { GlobalPlatformSettings, RegistrationMode } from "@/server/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CredentialsInfo {
  openaiConfigured: boolean;
  openaiKeyMasked: string;
  metaConfigured: boolean;
  metaAppId: string;
  metaAppSecretMasked: string;
  googleConfigured: boolean;
  googleClientId: string;
  googleClientSecretMasked: string;
  smtpConfigured?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassMasked?: string;
  smtpFrom?: string;
}

interface PlanOption {
  id: string;
  name: string;
  slug: string;
  monthly_price: number;
}

interface AdminSetupFormProps {
  initialGlobal: GlobalPlatformSettings;
  initialCredentials: CredentialsInfo;
  availablePlans: PlanOption[];
}

export function AdminSetupForm({
  initialGlobal,
  initialCredentials,
  availablePlans,
}: AdminSetupFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"global" | "credentials">("global");

  // Global Platform State
  const [registrationMode, setRegistrationMode] = useState<RegistrationMode>(
    initialGlobal.registrationMode || "open"
  );
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(
    initialGlobal.maintenanceMode || false
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState<string>(
    initialGlobal.maintenanceMessage ||
      "Lead Reach AI is currently undergoing scheduled platform upgrades. We will be back online shortly."
  );
  const [siteName, setSiteName] = useState<string>(initialGlobal.siteName || "Lead Reach AI");
  const [supportEmail, setSupportEmail] = useState<string>(
    initialGlobal.supportEmail || "support@leadreachai.cerkitlabs.tech"
  );
  const [defaultPlan, setDefaultPlan] = useState<string>(initialGlobal.defaultPlan || "free");
  const [trialDays, setTrialDays] = useState<number>(initialGlobal.trialDays ?? 14);

  // Credentials State
  const [metaAppId, setMetaAppId] = useState<string>(initialCredentials.metaAppId || "");
  const [metaAppSecret, setMetaAppSecret] = useState<string>("");
  const [googleClientId, setGoogleClientId] = useState<string>(
    initialCredentials.googleClientId || ""
  );
  const [googleClientSecret, setGoogleClientSecret] = useState<string>("");
  const [openaiApiKey, setOpenaiApiKey] = useState<string>("");

  // SMTP Email State
  const [smtpHost, setSmtpHost] = useState<string>(initialCredentials.smtpHost || "");
  const [smtpPort, setSmtpPort] = useState<string>(initialCredentials.smtpPort || "587");
  const [smtpUser, setSmtpUser] = useState<string>(initialCredentials.smtpUser || "");
  const [smtpPass, setSmtpPass] = useState<string>("");
  const [smtpFrom, setSmtpFrom] = useState<string>(initialCredentials.smtpFrom || "");
  const [testEmailTarget, setTestEmailTarget] = useState<string>("");

  // Test Connection States
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; message: string }>
  >({});

  // Form Save States
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTestConnection = async (provider: "openai" | "google" | "meta" | "smtp") => {
    setTestingProvider(provider);
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[provider];
      return next;
    });

    try {
      const payload: any = { provider };
      if (provider === "smtp") {
        payload.host = smtpHost;
        payload.port = smtpPort;
        payload.user = smtpUser;
        payload.pass = smtpPass;
        payload.from = smtpFrom;
        payload.testEmail = testEmailTarget;
      }
      const res = await fetch(`/api/v1/admin/setup/test?provider=${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          ok: Boolean(data.success),
          message: data.message || (data.success ? "Connection operational!" : data.error || "Connection failed."),
        },
      }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          ok: false,
          message: "Network error contacting test endpoint.",
        },
      }));
    } finally {
      setTestingProvider(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload: any = {
        // Global
        registrationMode,
        maintenanceMode,
        maintenanceMessage,
        siteName,
        supportEmail,
        defaultPlan,
        trialDays: Number(trialDays),
      };

      // Only pass non-empty credentials so we don't accidentally wipe existing ones
      if (metaAppId.trim()) payload.metaAppId = metaAppId.trim();
      if (metaAppSecret.trim()) payload.metaAppSecret = metaAppSecret.trim();
      if (googleClientId.trim()) payload.googleClientId = googleClientId.trim();
      if (googleClientSecret.trim()) payload.googleClientSecret = googleClientSecret.trim();
      if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
      if (smtpHost.trim()) payload.smtpHost = smtpHost.trim();
      if (smtpPort.trim()) payload.smtpPort = smtpPort.trim();
      if (smtpUser.trim()) payload.smtpUser = smtpUser.trim();
      if (smtpPass.trim()) payload.smtpPass = smtpPass.trim();
      if (smtpFrom.trim()) payload.smtpFrom = smtpFrom.trim();

      const res = await fetch("/api/v1/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update platform settings.");
      }

      setSaveSuccess(true);
      // Reset sensitive password inputs so they display masked placeholder
      setMetaAppSecret("");
      setGoogleClientSecret("");
      setOpenaiApiKey("");
      router.refresh();
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>Platform settings and credentials successfully updated. Redis cache purged.</span>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("global")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === "global"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-fg hover:bg-bgSubtle"
          }`}
        >
          <Sliders size={14} />
          <span>Platform Global Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
            activeTab === "credentials"
              ? "border-brand text-brand bg-brand/5"
              : "border-transparent text-muted hover:text-fg hover:bg-bgSubtle"
          }`}
        >
          <Key size={14} />
          <span>API Credentials &amp; Keys</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* TAB 1: GLOBAL PLATFORM SETTINGS */}
        {activeTab === "global" && (
          <div className="space-y-6">
            {/* Maintenance Mode Card */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                    <Wrench className="text-amber-600 dark:text-amber-400" size={18} /> Maintenance Mode
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    When active, all standard users see a maintenance screen. Staff/admins retain full access.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={maintenanceMode ? "warning" : "neutral"}
                    className="text-xs"
                  >
                    {maintenanceMode ? "Active (Under Maintenance)" : "Disabled (Online)"}
                  </Badge>
                  <Button
                    type="button"
                    onClick={() => setMaintenanceMode(!maintenanceMode)}
                    variant={maintenanceMode ? "danger" : "secondary"}
                    size="sm"
                  >
                    {maintenanceMode ? "Turn Off" : "Enable Maintenance"}
                  </Button>
                </div>
              </div>

              {maintenanceMode && (
                <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                  <Shield size={15} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold block">Maintenance Mode is ON</span>
                    Normal users will be blocked and redirected to the maintenance page. Staff can log in normally to configure the platform.
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Public Maintenance Message
                </label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  placeholder="Explain why the system is in maintenance..."
                />
              </div>
            </div>

            {/* Registration Mode Card */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                  <UserPlus className="text-brand" size={18} /> Registration Access Mode
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Control how new users can sign up and join the platform.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Mode: Open */}
                <div
                  onClick={() => setRegistrationMode("open")}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                    registrationMode === "open"
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-border bg-bgSubtle/40 hover:bg-bgSubtle"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                      <Radio size={14} className={registrationMode === "open" ? "text-brand" : "text-muted"} />
                      Open Registration
                    </span>
                    <Badge variant="success" className="text-[10px]">Public</Badge>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Anyone can create an account freely via email/password or Google OAuth.
                  </p>
                </div>

                {/* Mode: Invite Only */}
                <div
                  onClick={() => setRegistrationMode("invite")}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                    registrationMode === "invite"
                      ? "border-amber-500 bg-amber-500/5 shadow-sm"
                      : "border-border bg-bgSubtle/40 hover:bg-bgSubtle"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                      <Radio size={14} className={registrationMode === "invite" ? "text-amber-600 dark:text-amber-400" : "text-muted"} />
                      Invite-Only
                    </span>
                    <Badge variant="warning" className="text-[10px]">Invite Code</Badge>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Users must provide a valid invite token issued by administrators to complete sign-up.
                  </p>
                </div>

                {/* Mode: Closed */}
                <div
                  onClick={() => setRegistrationMode("closed")}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between gap-3 ${
                    registrationMode === "closed"
                      ? "border-rose-500 bg-rose-500/5 shadow-sm"
                      : "border-border bg-bgSubtle/40 hover:bg-bgSubtle"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-fg flex items-center gap-1.5">
                      <Lock size={14} className={registrationMode === "closed" ? "text-rose-600 dark:text-rose-400" : "text-muted"} />
                      Registration Closed
                    </span>
                    <Badge variant="danger" className="text-[10px]">Locked</Badge>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    New account registrations are completely disabled. Sign-up form is locked.
                  </p>
                </div>
              </div>
            </div>

            {/* Site Identity & Support */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                  <Globe className="text-brand" size={18} /> Platform Identity &amp; Support
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Platform branding and official customer support contact details.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Platform / Site Name</label>
                  <input
                    type="text"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="Lead Reach AI"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Support Contact Email</label>
                  <input
                    type="email"
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@leadreachai.cerkitlabs.tech"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Default Plan & Trial Period */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                  <Zap className="text-amber-600 dark:text-amber-400" size={18} /> Default Plan &amp; Trial Allocation
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Initial subscription tier and trial duration assigned automatically to new users.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Default Signup Plan</label>
                  <select
                    value={defaultPlan}
                    onChange={(e) => setDefaultPlan(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  >
                    {availablePlans.map((p) => (
                      <option key={p.id} value={p.slug}>
                        {p.name} ({p.slug.toUpperCase()}) — ${p.monthly_price}/mo
                      </option>
                    ))}
                    {availablePlans.length === 0 && (
                      <option value="free">Free Starter Plan (Default)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">
                    Trial Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="365"
                    value={trialDays}
                    onChange={(e) => setTrialDays(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    placeholder="14"
                  />
                  <span className="text-[10px] text-muted mt-1 block">
                    Set 0 to disable trial and require standard limits or instant subscription.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CREDENTIALS & API KEYS */}
        {activeTab === "credentials" && (
          <div className="space-y-6">
            {/* OpenAI Platform Key */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                    <Key className="text-brand" size={18} /> OpenAI Platform Key
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Powers social copywriting, cold email AI personalization, and lead classification.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={initialCredentials.openaiConfigured ? "success" : "neutral"}
                    className="text-[10px]"
                  >
                    {initialCredentials.openaiConfigured ? "Saved & Encrypted" : "Not Configured"}
                  </Badge>

                  <Button
                    type="button"
                    onClick={() => handleTestConnection("openai")}
                    disabled={testingProvider === "openai"}
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                  >
                    {testingProvider === "openai" ? (
                      <Loader2 size={12} className="animate-spin text-brand" />
                    ) : (
                      <Zap size={12} className="text-brand" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                </div>
              </div>

              {/* Test result message */}
              {testResults.openai && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResults.openai.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResults.openai.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResults.openai.message}</span>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  API Key (sk-...)
                </label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder={
                    initialCredentials.openaiKeyMasked
                      ? `Saved: ${initialCredentials.openaiKeyMasked} (leave empty to keep)`
                      : "sk-proj-..."
                  }
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  {initialCredentials.openaiConfigured
                    ? `Currently active: ${initialCredentials.openaiKeyMasked}. Leave empty to keep unchanged.`
                    : "Enter your OpenAI platform secret key to enable AI generation features."}
                </span>
              </div>
            </div>

            {/* Meta Platform App Config */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                    <Globe className="text-brand" size={18} /> Meta Developer App (Facebook &amp; Instagram)
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Used for automated posting to Facebook Pages and Instagram Business accounts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={initialCredentials.metaConfigured ? "success" : "neutral"}
                    className="text-[10px]"
                  >
                    {initialCredentials.metaConfigured ? "Active" : "Optional"}
                  </Badge>

                  <Button
                    type="button"
                    onClick={() => handleTestConnection("meta")}
                    disabled={testingProvider === "meta"}
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                  >
                    {testingProvider === "meta" ? (
                      <Loader2 size={12} className="animate-spin text-brand" />
                    ) : (
                      <Zap size={12} className="text-brand" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                </div>
              </div>

              {testResults.meta && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResults.meta.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResults.meta.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResults.meta.message}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">Meta App ID</label>
                  <input
                    type="text"
                    value={metaAppId}
                    onChange={(e) => setMetaAppId(e.target.value)}
                    placeholder="123456789012345"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">
                    Meta App Secret
                  </label>
                  <input
                    type="password"
                    value={metaAppSecret}
                    onChange={(e) => setMetaAppSecret(e.target.value)}
                    placeholder={
                      initialCredentials.metaAppSecretMasked
                        ? `Saved: ${initialCredentials.metaAppSecretMasked} (leave empty to keep)`
                        : "••••••••••••••••••••••••"
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>
            </div>

            {/* Google OAuth & Cloud Credentials */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                    <Globe className="text-brand" size={18} /> Google Cloud OAuth (Sheets &amp; Places)
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Connect Google Sheets lead auto-sync and Google Places Maps lead searches.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={initialCredentials.googleConfigured ? "success" : "neutral"}
                    className="text-[10px]"
                  >
                    {initialCredentials.googleConfigured ? "Active" : "Optional"}
                  </Badge>

                  <Button
                    type="button"
                    onClick={() => handleTestConnection("google")}
                    disabled={testingProvider === "google"}
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                  >
                    {testingProvider === "google" ? (
                      <Loader2 size={12} className="animate-spin text-brand" />
                    ) : (
                      <Zap size={12} className="text-brand" />
                    )}
                    <span>Test Connection</span>
                  </Button>
                </div>
              </div>

              {testResults.google && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResults.google.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResults.google.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResults.google.message}</span>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">
                    Google Client ID
                  </label>
                  <input
                    type="text"
                    value={googleClientId}
                    onChange={(e) => setGoogleClientId(e.target.value)}
                    placeholder="...apps.googleusercontent.com"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">
                    Google Client Secret
                  </label>
                  <input
                    type="password"
                    value={googleClientSecret}
                    onChange={(e) => setGoogleClientSecret(e.target.value)}
                    placeholder={
                      initialCredentials.googleClientSecretMasked
                        ? `Saved: ${initialCredentials.googleClientSecretMasked} (leave empty to keep)`
                        : "••••••••••••••••••••••••"
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>
            </div>

            {/* System SMTP Email Gateway */}
            <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 text-fg">
                    <Mail className="text-brand" size={18} /> System SMTP Email Gateway
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Powers verification emails, password reset links, and system notifications (Zoho Mail, Gmail, or custom SMTP).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge
                    variant={initialCredentials.smtpConfigured || (smtpHost && smtpFrom) ? "success" : "neutral"}
                    className="text-[10px]"
                  >
                    {initialCredentials.smtpConfigured || (smtpHost && smtpFrom) ? "Configured" : "Not Configured"}
                  </Badge>

                  <Button
                    type="button"
                    onClick={() => handleTestConnection("smtp")}
                    disabled={testingProvider === "smtp"}
                    variant="ghost"
                    size="sm"
                    className="inline-flex items-center gap-1.5"
                  >
                    {testingProvider === "smtp" ? (
                      <Loader2 size={12} className="animate-spin text-brand" />
                    ) : (
                      <Zap size={12} className="text-brand" />
                    )}
                    <span>Send Test Email</span>
                  </Button>
                </div>
              </div>

              {/* Test result message */}
              {testResults.smtp && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    testResults.smtp.ok
                      ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
                      : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
                  }`}
                >
                  {testResults.smtp.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  <span>{testResults.smtp.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.zoho.com"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">SMTP Port</label>
                  <input
                    type="text"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="465 (SSL) or 587 (TLS)"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">From Sender Address</label>
                  <input
                    type="text"
                    value={smtpFrom}
                    onChange={(e) => setSmtpFrom(e.target.value)}
                    placeholder="noreply@cerkitlabs.tech"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">SMTP Username / Email</label>
                  <input
                    type="text"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="noreply@cerkitlabs.tech"
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted block mb-1">SMTP Password / App Password</label>
                  <input
                    type="password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    placeholder={
                      initialCredentials.smtpPassMasked
                        ? `Saved: ${initialCredentials.smtpPassMasked} (leave empty to keep)`
                        : "••••••••••••••••••••••••"
                    }
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 font-mono text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Save Button Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
          <span className="text-[11px] text-muted">
            All updates are securely encrypted and automatically flushed from Redis cache.
          </span>

          <Button
            type="submit"
            disabled={saving}
            variant="primary"
            size="sm"
            className="inline-flex items-center gap-2 self-start sm:self-auto"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? "Saving Changes..." : "Save Platform Configuration"}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
