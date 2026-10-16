"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  CheckCircle2,
  AlertCircle,
  Mail,
  Server,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Clock,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface EmailAccount {
  id: string;
  label: string;
  from_name?: string | null;
  from_email: string;
  reply_to?: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_security: string;
  smtp_username: string;
  imap_host: string;
  imap_port: number;
  imap_security: string;
  hourly_limit: number;
  daily_limit: number;
  status: string;
  last_error?: string | null;
  sentLastHour?: number;
  sentToday?: number;
}

const PROVIDER_PRESETS = [
  {
    id: "gmail",
    name: "Google Workspace / Gmail",
    desc: "Requires Google App Password",
    smtp_host: "smtp.gmail.com",
    smtp_port: 465,
    smtp_security: "ssl",
    imap_host: "imap.gmail.com",
    imap_port: 993,
    imap_security: "ssl",
  },
  {
    id: "hostinger",
    name: "Hostinger Business",
    desc: "Standard Hostinger email",
    smtp_host: "smtp.hostinger.com",
    smtp_port: 465,
    smtp_security: "ssl",
    imap_host: "imap.hostinger.com",
    imap_port: 993,
    imap_security: "ssl",
  },
  {
    id: "namecheap",
    name: "Namecheap / PrivateEmail",
    desc: "Jellyfish / PrivateEmail hosting",
    smtp_host: "mail.privateemail.com",
    smtp_port: 465,
    smtp_security: "ssl",
    imap_host: "mail.privateemail.com",
    imap_port: 993,
    imap_security: "ssl",
  },
  {
    id: "zoho",
    name: "Zoho Mail",
    desc: "Zoho workplace or free suite",
    smtp_host: "smtppro.zoho.com",
    smtp_port: 465,
    smtp_security: "ssl",
    imap_host: "imappro.zoho.com",
    imap_port: 993,
    imap_security: "ssl",
  },
  {
    id: "office365",
    name: "Microsoft 365 / Outlook",
    desc: "Exchange Online SMTP AUTH",
    smtp_host: "smtp.office365.com",
    smtp_port: 587,
    smtp_security: "tls",
    imap_host: "outlook.office365.com",
    imap_port: 993,
    imap_security: "ssl",
  },
  {
    id: "custom",
    name: "Custom SMTP / IMAP",
    desc: "Any cPanel, Postfix or VPS mail server",
    smtp_host: "",
    smtp_port: 465,
    smtp_security: "ssl",
    imap_host: "",
    imap_port: 993,
    imap_security: "ssl",
  },
];

export function EmailAccountsManager({
  initialAccounts,
}: {
  initialAccounts: EmailAccount[];
}) {
  const [accounts, setAccounts] = useState<EmailAccount[]>(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState("hostinger");

  // Form Fields
  const [label, setLabel] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const [smtpHost, setSmtpHost] = useState("smtp.hostinger.com");
  const [smtpPort, setSmtpPort] = useState(465);
  const [smtpSecurity, setSmtpSecurity] = useState("ssl");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");

  const [syncImap, setSyncImap] = useState(true);
  const [imapHost, setImapHost] = useState("imap.hostinger.com");
  const [imapPort, setImapPort] = useState(993);
  const [imapSecurity, setImapSecurity] = useState("ssl");
  const [imapUser, setImapUser] = useState("");
  const [imapPass, setImapPass] = useState("");

  const [hourlyLimit, setHourlyLimit] = useState(25);
  const [dailyLimit, setDailyLimit] = useState(150);

  // Testing & Submitting State
  const [modalTesting, setModalTesting] = useState(false);
  const [modalTestResult, setModalTestResult] = useState<{
    ok: boolean;
    smtpMsg?: string;
    imapMsg?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Per-account test status for the list
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = PROVIDER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSmtpHost(preset.smtp_host);
    setSmtpPort(preset.smtp_port);
    setSmtpSecurity(preset.smtp_security);
    setImapHost(preset.imap_host);
    setImapPort(preset.imap_port);
    setImapSecurity(preset.imap_security);
  };

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/email-accounts");
      const json = await res.json();
      if (json.data) {
        setAccounts(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleTestExisting = async (accountId: string) => {
    setTestingId(accountId);
    try {
      const res = await fetch(`/api/v1/email-accounts/${accountId}`);
      const json = await res.json();
      if (json.data) {
        const smtpOk = json.data.smtp?.ok;
        const imapOk = json.data.imap?.ok;
        const ok = Boolean(smtpOk && imapOk);
        const msg = ok
          ? "SMTP & IMAP Connected"
          : `Error: ${json.data.smtp?.error || json.data.imap?.error || "Failed"}`;
        setTestResults((prev) => ({ ...prev, [accountId]: { ok, message: msg } }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [accountId]: { ok: false, message: err.message || "Network test failed" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteAccount = async (accountId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove inbox "${email}"? Outgoing campaigns using it will rotate to other active inboxes.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/email-accounts/${accountId}`, { method: "DELETE" });
      if (res.ok) {
        setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      }
    } catch {
      alert("Failed to delete inbox.");
    }
  };

  const handleModalTestConnection = async () => {
    setModalTesting(true);
    setModalTestResult(null);
    setFormError(null);

    const actualImapUser = syncImap ? smtpUser : imapUser;
    const actualImapPass = syncImap ? smtpPass : imapPass;

    try {
      const res = await fetch("/api/v1/email-accounts/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtp: {
            host: smtpHost,
            port: smtpPort,
            security: smtpSecurity,
            username: smtpUser,
            password: smtpPass,
          },
          imap: {
            host: imapHost,
            port: imapPort,
            security: imapSecurity,
            username: actualImapUser,
            password: actualImapPass,
          },
        }),
      });
      const json = await res.json();
      if (json.data) {
        const smtpOk = json.data.smtp?.ok;
        const imapOk = json.data.imap?.ok;
        setModalTestResult({
          ok: Boolean(smtpOk && imapOk),
          smtpMsg: smtpOk ? "Verified" : json.data.smtp?.error,
          imapMsg: imapOk ? "Verified" : json.data.imap?.error,
        });
      } else {
        setFormError(json.error || "Connection test failed.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to reach server for testing.");
    } finally {
      setModalTesting(false);
    }
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const actualImapUser = syncImap ? smtpUser : imapUser;
    const actualImapPass = syncImap ? smtpPass : imapPass;

    try {
      const res = await fetch("/api/v1/email-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || `${fromName || fromEmail.split("@")[0]} Inbox`,
          from_name: fromName,
          from_email: fromEmail,
          reply_to: replyTo || undefined,
          smtp_host: smtpHost,
          smtp_port: smtpPort,
          smtp_security: smtpSecurity,
          smtp_username: smtpUser,
          smtp_password: smtpPass,
          imap_host: imapHost,
          imap_port: imapPort,
          imap_security: imapSecurity,
          imap_username: actualImapUser,
          imap_password: actualImapPass,
          hourly_limit: hourlyLimit,
          daily_limit: dailyLimit,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to register inbox");
      }

      setIsModalOpen(false);
      resetForm();
      await fetchAccounts();
    } catch (err: any) {
      setFormError(err.message || "Failed to save email account");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setLabel("");
    setFromName("");
    setFromEmail("");
    setReplyTo("");
    setSmtpUser("");
    setSmtpPass("");
    setImapUser("");
    setImapPass("");
    setModalTestResult(null);
    setFormError(null);
  };

  const totalHourlyCap = accounts.reduce((acc, a) => acc + (a.hourly_limit || 25), 0);
  const totalDailyCap = accounts.reduce((acc, a) => acc + (a.daily_limit || 150), 0);

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg flex items-center gap-2">
            Sender Inboxes &amp; Email Accounts
            <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
              P3 Outreach
            </Badge>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Connect your business SMTP/IMAP inboxes. Rotated automatically via Round-robin with a safety cap of 25 emails/hour per inbox.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          icon={<Plus size={14} />}
        >
          Connect Email Account
        </Button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-bgSubtle border border-border text-fg">
            <Mail size={18} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Connected Senders</div>
            <div className="text-xl font-bold text-fg">{accounts.length} Inboxes</div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-bgSubtle border border-border text-success">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Max Sending Velocity</div>
            <div className="text-xl font-bold text-fg">
              {totalHourlyCap} <span className="text-xs font-normal text-muted">/ hr (Safe Rotation)</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-bgSubtle border border-border text-fg">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="text-xs text-muted font-medium">Combined Daily Reach</div>
            <div className="text-xl font-bold text-fg">
              {totalDailyCap} <span className="text-xs font-normal text-muted">/ day maximum</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider">
            Configured Accounts ({accounts.length})
          </h2>
          <button
            onClick={fetchAccounts}
            className="text-xs text-muted hover:text-fg inline-flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-lg bg-bgSubtle border border-border text-fg flex items-center justify-center">
              <Mail size={20} />
            </div>
            <h3 className="text-sm font-semibold text-fg">No Sender Inboxes Connected Yet</h3>
            <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
              Connect your domain email (Hostinger, Namecheap, Google Workspace, Zoho) to start automated cold email outreach with verified inbox rotation.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              icon={<Plus size={14} />}
            >
              Connect First Inbox
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {accounts.map((a) => {
              const test = testResults[a.id];
              const isTesting = testingId === a.id;

              return (
                <div
                  key={a.id}
                  className="p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 hover:bg-surfaceHover transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-fg truncate">{a.from_email}</span>
                      <Badge variant="neutral" size="sm">
                        {a.label}
                      </Badge>
                      <Badge variant="success" size="sm" className="flex items-center gap-1">
                        <CheckCircle2 size={11} /> {a.status}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Server size={11} className="text-subtle shrink-0" />
                        SMTP: {a.smtp_host}:{a.smtp_port}
                      </span>
                      <span>•</span>
                      <span>IMAP: {a.imap_host}:{a.imap_port}</span>
                      <span>•</span>
                      <span className="font-medium text-fg">
                        Sending Cap: {a.hourly_limit || 25}/hr (Max 25)
                      </span>
                    </div>

                    {/* Test feedback */}
                    {test && (
                      <div
                        className={`text-xs mt-1 flex items-center gap-1.5 font-mono ${
                          test.ok ? "text-success" : "text-danger"
                        }`}
                      >
                        {test.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        <span>{test.message}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTestExisting(a.id)}
                      disabled={isTesting}
                      icon={<RefreshCw size={12} className={isTesting ? "animate-spin" : ""} />}
                    >
                      {isTesting ? "Testing..." : "Test SMTP/IMAP"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDeleteAccount(a.id, a.from_email)}
                      title="Remove Account"
                      icon={<Trash2 size={13} />}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Safety Compliance Note */}
      <div className="rounded-xl border border-border bg-bgSubtle p-4 flex items-start gap-3 text-xs text-muted leading-relaxed">
        <Info size={15} className="text-fg shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-fg">Deliverability &amp; Reputation Guard:</span> AutoHub strictly enforces a maximum rate limit of <strong>25 emails per hour</strong> per inbox. Each email is dispatched with randomized jitter delay (60–180 seconds) and automatic round-robin rotation to keep spam scores near zero and protect domain DNS reputation.
        </div>
      </div>

      {/* Modal: Connect Email Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-base font-bold text-fg flex items-center gap-2">
                  <Mail size={16} /> Connect Sender Email Account
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Credentials are encrypted with AES-256-GCM before saving to database.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted hover:text-fg text-sm font-semibold p-1"
              >
                ✕
              </button>
            </div>

            {/* Quick Provider Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted block">
                Select Mail Provider Preset
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PROVIDER_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleApplyPreset(p.id)}
                    className={`p-2.5 rounded-lg border text-left transition-colors text-xs ${
                      selectedPreset === p.id
                        ? "border-primary bg-bgSubtle font-medium text-fg"
                        : "border-border bg-surface hover:bg-surfaceHover text-muted"
                    }`}
                  >
                    <div className="font-semibold text-fg truncate">{p.name}</div>
                    <div className="text-[10px] text-muted truncate">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              {/* Basic Sender Identity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">
                    Sender Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Morgan"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="input w-full text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">
                    Sender Email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. sales@yourdomain.com"
                    value={fromEmail}
                    onChange={(e) => {
                      setFromEmail(e.target.value);
                      if (!smtpUser) setSmtpUser(e.target.value);
                    }}
                    className="input w-full text-xs font-mono h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">Account Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Outreach Inbox 1"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="input w-full text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">Reply-To (Optional)</label>
                  <input
                    type="email"
                    placeholder="Leave blank to reply to sender email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="input w-full text-xs font-mono h-9"
                  />
                </div>
              </div>

              {/* SMTP Settings */}
              <div className="p-3.5 rounded-lg bg-bgSubtle border border-border space-y-2.5">
                <div className="text-xs font-semibold text-fg flex items-center justify-between">
                  <span>Outgoing Mail (SMTP) Settings</span>
                  <span className="text-[10px] text-muted font-normal">Used to dispatch cold emails</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="SMTP Host (e.g. smtp.hostinger.com)"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="input w-full text-xs font-mono h-9"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      required
                      placeholder="Port (465/587)"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      className="input w-full text-xs font-mono h-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="SMTP Username (usually email)"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="input w-full text-xs font-mono h-9"
                  />
                  <input
                    type="password"
                    required
                    placeholder="SMTP Password / App Password"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="input w-full text-xs font-mono h-9"
                  />
                </div>
              </div>

              {/* IMAP Settings */}
              <div className="p-3.5 rounded-lg bg-bgSubtle border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg">Incoming Mail (IMAP) Settings</span>
                  <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncImap}
                      onChange={(e) => setSyncImap(e.target.checked)}
                      className="rounded"
                    />
                    Same as SMTP
                  </label>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      required
                      placeholder="IMAP Host (e.g. imap.hostinger.com)"
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      className="input w-full text-xs font-mono h-9"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      required
                      placeholder="Port (993)"
                      value={imapPort}
                      onChange={(e) => setImapPort(Number(e.target.value))}
                      className="input w-full text-xs font-mono h-9"
                    />
                  </div>
                </div>

                {!syncImap && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="IMAP Username"
                      value={imapUser}
                      onChange={(e) => setImapUser(e.target.value)}
                      className="input w-full text-xs font-mono h-9"
                    />
                    <input
                      type="password"
                      placeholder="IMAP Password"
                      value={imapPass}
                      onChange={(e) => setImapPass(e.target.value)}
                      className="input w-full text-xs font-mono h-9"
                    />
                  </div>
                )}
              </div>

              {/* Rate Limit Cap */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">
                    Hourly Sending Cap (Max 25 / hr)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={25}
                    value={hourlyLimit}
                    onChange={(e) => setHourlyLimit(Math.min(25, Number(e.target.value)))}
                    className="input w-full text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-fg block mb-1">
                    Daily Sending Cap (Safe default: 150)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={500}
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(Number(e.target.value))}
                    className="input w-full text-xs h-9"
                  />
                </div>
              </div>

              {/* Error or Live Test Feedback */}
              {formError && (
                <div className="p-3 rounded-lg bg-dangerBg border border-danger/30 text-danger text-xs flex items-center gap-2">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {modalTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1 ${
                    modalTestResult.ok
                      ? "bg-successBg border-success/30 text-success"
                      : "bg-dangerBg border-danger/30 text-danger"
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {modalTestResult.ok ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {modalTestResult.ok ? "All Connection Checks Passed!" : "Connection Checks Failed"}
                  </div>
                  <div>SMTP Handshake: {modalTestResult.smtpMsg}</div>
                  <div>IMAP INBOX Access: {modalTestResult.imapMsg}</div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleModalTestConnection}
                  disabled={modalTesting || !smtpHost || !smtpUser || !smtpPass}
                  icon={<RefreshCw size={12} className={modalTesting ? "animate-spin" : ""} />}
                >
                  {modalTesting ? "Verifying..." : "Test Connection"}
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Inbox"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
