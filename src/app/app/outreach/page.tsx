import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { listCampaigns } from "@/server/email/campaign-service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { OutreachDashboard, CampaignSummary } from "./outreach-dashboard";
import type { EmailAccount } from "./email-accounts/email-accounts-manager";

export const metadata = {
  title: "Cold Outreach — AutoHub",
  description: "Multi-inbox rotation, human-like random pacing, and automatic stop-on-reply.",
};

function OutreachSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 bg-bgSubtle rounded-lg" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 bg-bgSubtle rounded-xl" />
        ))}
      </div>
      <div className="h-96 bg-bgSubtle rounded-xl" />
    </div>
  );
}

export default async function OutreachOverviewPage() {
  const user = await requireUser();

  const [rawCampaigns, accountsRaw, repliesRaw, totalRepliesCount] = await Promise.all([
    listCampaigns(user.id),
    db.email_accounts.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        label: true,
        provider: true,
        from_name: true,
        from_email: true,
        reply_to: true,
        signature: true,
        smtp_host: true,
        smtp_port: true,
        smtp_security: true,
        smtp_username: true,
        imap_host: true,
        imap_port: true,
        imap_security: true,
        hourly_limit: true,
        daily_limit: true,
        gap_seconds: true,
        min_gap_seconds: true,
        max_gap_seconds: true,
        timezone: true,
        warmup_enabled: true,
        warmup_day: true,
        warmup_start_limit: true,
        warmup_daily_increment: true,
        warmup_max_limit: true,
        dns_spf_status: true,
        dns_dkim_status: true,
        dns_dmarc_status: true,
        status: true,
        last_error: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
    db.email_messages.findMany({
      where: {
        user_id: user.id,
        direction: "in",
      },
      take: 20,
      orderBy: { sent_at: "desc" },
      select: {
        id: true,
        subject: true,
        snippet: true,
        in_reply_to: true,
        sent_at: true,
        recipient_id: true,
        recipient: {
          select: {
            email: true,
            name: true,
            company: true,
            campaign: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    db.email_messages.count({
      where: {
        user_id: user.id,
        direction: "in",
      },
    }),
  ]);

  const initialCampaigns: CampaignSummary[] = rawCampaigns.map((c: any) => ({
    id: c.id,
    name: c.name,
    mode: c.mode,
    status: c.status,
    timezone: c.timezone,
    totalRecipients: c.totalRecipients || 0,
    queuedCount: c.queuedCount || 0,
    sentCount: c.sentCount || 0,
    repliesCount: c.repliesCount || 0,
    bouncedCount: c.bouncedCount || 0,
    unsubscribedCount: c.unsubscribedCount || 0,
    failedCount: c.failedCount || 0,
    openedCount: c.openedCount || 0,
    created_at: c.created_at ? new Date(c.created_at).toISOString() : undefined,
    launched_at: c.launched_at ? new Date(c.launched_at).toISOString() : undefined,
  }));

  const initialAccounts: EmailAccount[] = accountsRaw.map((a: any) => ({
    id: a.id,
    label: a.label,
    provider: a.provider || "smtp",
    from_name: a.from_name,
    from_email: a.from_email,
    reply_to: a.reply_to,
    signature: a.signature,
    smtp_host: a.smtp_host,
    smtp_port: a.smtp_port,
    smtp_security: a.smtp_security,
    smtp_username: a.smtp_username,
    imap_host: a.imap_host,
    imap_port: a.imap_port,
    imap_security: a.imap_security,
    hourly_limit: a.hourly_limit || 25,
    daily_limit: a.daily_limit || 150,
    gap_seconds: a.gap_seconds || 180,
    min_gap_seconds: a.min_gap_seconds || 180,
    max_gap_seconds: a.max_gap_seconds || 420,
    timezone: a.timezone || "UTC",
    warmup_enabled: a.warmup_enabled || false,
    warmup_day: a.warmup_day || 1,
    warmup_start_limit: a.warmup_start_limit || 10,
    warmup_daily_increment: a.warmup_daily_increment || 5,
    warmup_max_limit: a.warmup_max_limit || 50,
    dns_spf_status: a.dns_spf_status,
    dns_dkim_status: a.dns_dkim_status,
    dns_dmarc_status: a.dns_dmarc_status,
    status: a.status || "active",
    last_error: a.last_error,
    created_at: a.created_at ? new Date(a.created_at).toISOString() : undefined,
  }));

  const initialReplies = repliesRaw.map((r: any) => ({
    id: r.id,
    subject: r.subject || "(No Subject)",
    snippet: r.snippet || "",
    sent_at: r.sent_at ? new Date(r.sent_at).toISOString() : undefined,
    recipientEmail: r.recipient?.email || "Unknown",
    recipientName: r.recipient?.name || "",
    recipientCompany: r.recipient?.company || "",
    campaignId: r.recipient?.campaign?.id,
    campaignName: r.recipient?.campaign?.name || "Direct Email",
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cold Outreach"
        description="Automated multi-inbox cold emailing with human-like randomized delays and stop-on-reply protection."
        actions={
          <Link href="/app/outreach/new">
            <Button variant="primary" size="md" icon={<Plus size={16} />}>
              New Campaign
            </Button>
          </Link>
        }
      />

      <Suspense fallback={<OutreachSkeleton />}>
        <OutreachDashboard
          initialCampaigns={initialCampaigns}
          initialAccounts={initialAccounts}
          initialReplies={initialReplies}
          totalRepliesCount={totalRepliesCount}
        />
      </Suspense>
    </div>
  );
}
