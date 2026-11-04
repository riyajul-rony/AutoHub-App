"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight, X, Sparkles } from "lucide-react";

interface GetStartedChecklistProps {
  userId: string;
  hasConnectedInbox: boolean;
  hasGeneratedLeads: boolean;
  hasLaunchedCampaign: boolean;
}

export function GetStartedChecklist({
  userId,
  hasConnectedInbox,
  hasGeneratedLeads,
  hasLaunchedCampaign,
}: GetStartedChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  const storageKey = `leadreach:hub:checklist-dismissed:${userId}`;

  useEffect(() => {
    setMounted(true);
    try {
      const isDismissed = localStorage.getItem(storageKey) === "true";
      if (isDismissed) {
        setDismissed(true);
      }
    } catch {
      // ignore localStorage error in private browsing
    }
  }, [storageKey]);

  const steps = [
    {
      id: "inbox",
      title: "Connect an email inbox",
      description: "Link your Gmail or custom SMTP sender account to dispatch outbound messages.",
      href: "/app/settings/email",
      completed: hasConnectedInbox,
      actionLabel: "Connect Inbox",
    },
    {
      id: "leads",
      title: "Generate your first leads",
      description: "Find local B2B prospects with Google Maps scraper or import a CSV lead list.",
      href: "/app/leads",
      completed: hasGeneratedLeads,
      actionLabel: "Find Leads",
    },
    {
      id: "campaign",
      title: "Launch your first campaign",
      description: "Configure cold outreach dispatches, AI templates, and automated follow-ups.",
      href: "/app/outreach/new",
      completed: hasLaunchedCampaign,
      actionLabel: "New Campaign",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;
  const progressPct = Math.round((completedCount / steps.length) * 100);

  // If dismissed or mounted and already all completed with dismissal, don't show
  if (!mounted || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "true");
    } catch {}
  };

  return (
    <div className="rounded-[8px] border border-border bg-surface p-5 space-y-4 transition-colors duration-150 hover:border-borderStrong">
      {/* Header & Progress */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text">Get started with Lead Reach AI</h3>
            {allCompleted && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--badge-success-text)] bg-[var(--brand-emerald-subtle)] border border-[var(--brand-emerald-border)] px-1.5 py-0.5 rounded">
                <Sparkles size={11} /> All done!
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {completedCount} of {steps.length} onboarding steps completed ({progressPct}%)
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-text-subtle hover:text-text p-1 rounded transition-colors text-xs flex items-center gap-1"
          title="Dismiss checklist"
        >
          <span className="hidden sm:inline text-[11px]">Dismiss</span>
          <X size={14} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 rounded-full bg-bg-subtle border border-border overflow-hidden">
        <div
          className="h-full bg-[var(--brand-emerald)] transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="divide-y divide-border/60 pt-1">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className="py-3 first:pt-2 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              {step.completed ? (
                <div className="w-5 h-5 rounded-full bg-[var(--brand-emerald-subtle)] border border-[var(--brand-emerald-border)] flex items-center justify-center text-[var(--badge-success-text)] shrink-0 mt-0.5">
                  <Check size={12} strokeWidth={2.5} />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full bg-bg-subtle border border-border flex items-center justify-center text-[10px] font-mono text-text-muted shrink-0 mt-0.5">
                  {idx + 1}
                </div>
              )}

              <div>
                <span
                  className={`text-xs font-medium block leading-tight ${
                    step.completed ? "text-text-muted line-through" : "text-text"
                  }`}
                >
                  {step.title}
                </span>
                <span className="text-[11px] text-text-subtle leading-normal mt-0.5 block">
                  {step.description}
                </span>
              </div>
            </div>

            <div className="self-end sm:self-center shrink-0">
              {step.completed ? (
                <span className="text-[11px] text-[var(--badge-success-text)] font-medium flex items-center gap-1">
                  Done
                </span>
              ) : (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1 text-xs font-medium text-text hover:text-[var(--badge-success-text)] transition-colors"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

