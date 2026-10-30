import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { CampaignDetailClient, CampaignDetail } from "./campaign-detail-client";

export const metadata = {
  title: "Campaign Details — AutoHub",
  description: "Real-time metrics, sent logs, and sender inbox health.",
};

export default async function OutreachCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const campaign = await db.outreach_campaigns.findFirst({
    where: { id, user_id: user.id },
  });

  if (!campaign) {
    return (
      <div className="mx-auto max-w-6xl py-12 text-center space-y-4">
        <h2 className="text-xl font-bold">Campaign Not Found</h2>
        <p className="text-xs text-muted">The requested campaign does not exist or you do not have permission.</p>
        <Link href="/app/outreach" className="btn btn-ghost text-xs">
          <ArrowLeft size={14} /> Back to Campaigns
        </Link>
      </div>
    );
  }

  const [recipientsRaw, accountsRaw, stepsRaw] = await Promise.all([
    db.campaign_recipients.findMany({
      where: { campaign_id: id, user_id: user.id },
      take: 150,
    }),
    db.email_accounts.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        label: true,
        from_email: true,
        hourly_limit: true,
        status: true,
      },
    }),
    db.campaign_steps?.findMany
      ? db.campaign_steps.findMany({
          where: { campaign_id: id },
          orderBy: { step_no: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const total = recipientsRaw.length;
  const sent = recipientsRaw.filter((r: any) => r.status === "sent" || r.status === "replied").length;
  const replied = recipientsRaw.filter((r: any) => r.status === "replied").length;
  const bounced = recipientsRaw.filter((r: any) => r.status === "bounced").length;
  const unsubscribed = recipientsRaw.filter((r: any) => r.status === "unsubscribed").length;
  const failed = recipientsRaw.filter((r: any) => r.status === "failed").length;
  const queued = recipientsRaw.filter((r: any) => r.status === "queued" || r.status === "sending").length;
  const opened = recipientsRaw.filter((r: any) => (r.open_count || 0) > 0).length;
  const clicked = recipientsRaw.filter((r: any) => (r.click_count || 0) > 0).length;

  const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0";
  const bounceRate = sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0";
  const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0";
  const clickRate = sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0";

  const initialData: CampaignDetail = {
    campaign,
    stats: {
      total,
      queued,
      sent,
      replied,
      bounced,
      unsubscribed,
      failed,
      opened,
      clicked,
      replyRate,
      bounceRate,
      openRate,
      clickRate,
    },
    senderAccounts: accountsRaw,
    recipients: recipientsRaw,
    steps: stepsRaw || [],
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      <CampaignDetailClient campaignId={id} initialData={initialData} />
    </div>
  );
}
