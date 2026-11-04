import React from "react";
import Link from "next/link";
import { ArrowUpRight, Send, Search, Mail, Sparkles } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { cacheRemember } from "@/server/cache";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { GetStartedChecklist } from "@/components/hub/get-started-checklist";

export const metadata = {
  title: "Hub — Lead Reach AI",
  description: "Select an automation engine to get started.",
};

export default async function HubPage() {
  const user = await requireUser();
  const userId = user.id;

  const [postsCount, leadsCount, emailsCount, inboxesCount, campaignsCount] =
    await cacheRemember(`stats:hub:${userId}`, 60, async () => {
      return await Promise.all([
        db.post_runs.count({ where: { user_id: userId, status: "published" } }),
        db.leads.count({ where: { user_id: userId } }),
        db.email_messages.count({ where: { user_id: userId, direction: "out", status: "sent" } }),
        db.email_accounts.count({ where: { user_id: userId } }),
        db.outreach_campaigns.count({ where: { user_id: userId } }),
      ]);
    });

  const firstName = user.name
    ? user.name.trim().split(" ")[0]
    : user.email.split("@")[0] || "there";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      {/* Top Greeting & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-text">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-text-muted mt-1">
            Welcome to your command center. Monitor automations, generate prospects, and launch campaigns.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/app/outreach/new">
            <Button variant="primary" size="sm" icon={<Send size={13} />}>
              Launch Campaign
            </Button>
          </Link>
          <Link href="/app/leads">
            <Button variant="secondary" size="sm" icon={<Search size={13} />}>
              Generate Leads
            </Button>
          </Link>
          <Link href="/app/settings/email">
            <Button variant="secondary" size="sm" icon={<Mail size={13} />}>
              Connect Inbox
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist (Computed from Real DB state) */}
      <GetStartedChecklist
        userId={userId}
        hasConnectedInbox={inboxesCount > 0}
        hasGeneratedLeads={leadsCount > 0}
        hasLaunchedCampaign={campaignsCount > 0}
      />

      {/* 4 Core Module Cards */}
      <section className="space-y-3" aria-label="Automation engines">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Automation Engines</h2>
          <span className="text-xs text-text-muted">Select an engine to manage</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {MODULES.map((m) => (
            <Link
              key={m.id}
              id={`hub-card-${m.id}`}
              href={m.href}
              className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-[8px]"
            >
              <Card className="h-full transition-colors duration-150 hover:border-borderStrong hover:bg-surface-hover/20 p-5 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-[7px] border border-border bg-bg-subtle text-text flex items-center justify-center transition-colors group-hover:border-borderStrong">
                      <m.icon className="w-4 h-4 text-text-muted group-hover:text-text transition-colors" strokeWidth={1.5} />
                    </div>
                    <ArrowUpRight
                      className="w-4 h-4 text-text-subtle group-hover:text-text transition-colors"
                      strokeWidth={1.5}
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-text group-hover:text-text transition-colors">
                      {m.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed line-clamp-2">
                      {m.description}
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap gap-1.5 border-t border-border/40 mt-3">
                  {m.options.map((o) => (
                    <Badge key={o.href} variant="neutral" size="sm">
                      {o.label}
                    </Badge>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Lifetime Performance Counters */}
      <section className="space-y-3" aria-label="Quick metrics">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">Lifetime Performance</h2>
          <span className="text-xs text-text-muted">Real-time aggregate activity</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4 space-y-1 transition-colors duration-150 hover:border-borderStrong">
            <p className="text-xs font-medium text-text-muted">Social Posts Published</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-text">
              {postsCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-text-subtle">Across Facebook, Instagram &amp; LinkedIn</p>
          </Card>

          <Card className="p-4 space-y-1 transition-colors duration-150 hover:border-borderStrong">
            <p className="text-xs font-medium text-text-muted">Leads Collected</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-text">
              {leadsCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-text-subtle">Captured via Google Maps &amp; CSV</p>
          </Card>

          <Card className="p-4 space-y-1 transition-colors duration-150 hover:border-borderStrong">
            <p className="text-xs font-medium text-text-muted">Emails Dispatched</p>
            <p className="text-2xl font-bold font-mono tracking-tight text-text">
              {emailsCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-text-subtle">Delivered through connected inboxes</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
