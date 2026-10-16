import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { assertLimit } from "@/server/billing/limits";

export interface RecipientInput {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  lead_id?: string;
  vars?: Record<string, any>;
}

export interface CreateCampaignInput {
  name: string;
  mode: "ai" | "custom";
  senderAccountIds: string[];
  recipientSource: "leads" | "manual";
  sourceRef?: any;
  recipients: RecipientInput[];
  subjectTemplate?: string;
  bodyTemplate?: string;
  aiConfig?: {
    systemPrompt?: string;
    goalOrOffer?: string;
    tone?: string;
    textModel?: string;
  };
  openaiKeyId?: string;
  textModel?: string;
  sendWindow?: {
    startHour: number; // e.g. 9
    endHour: number;   // e.g. 18
  };
  timezone: string;
  jitterMinSec?: number;
  jitterMaxSec?: number;
  senderAddressFooter?: string;
  launchNow?: boolean;
}

export async function createOutreachCampaign(userId: string, input: CreateCampaignInput) {
  await assertLimit(userId, "max_campaigns", 1);

  if (!input.name?.trim()) {
    throw new Error("Campaign name is required");
  }

  if (!input.senderAccountIds || input.senderAccountIds.length === 0) {
    throw new Error("At least one sender email account must be selected");
  }

  // Verify accounts belong to user and are active
  const userAccounts = await db.email_accounts.findMany({
    where: { user_id: userId, status: "active" },
  });
  const validAccountIds = userAccounts
    .map((a: any) => a.id)
    .filter((id: string) => input.senderAccountIds.includes(id));

  if (validAccountIds.length === 0) {
    throw new Error("No active sender email accounts selected");
  }

  // Load suppressions only for candidate recipients in this batch
  const candidateEmails = Array.from(
    new Set(
      input.recipients
        .map((r) => (r.email || "").toLowerCase().trim())
        .filter((e) => e.length > 3 && e.includes("@"))
    )
  );

  const userSuppressions = candidateEmails.length > 0
    ? await db.suppressions.findMany({
        where: {
          user_id: userId,
          email: { in: candidateEmails },
        },
        select: { email: true },
      })
    : [];
  const suppressedSet = new Set(userSuppressions.map((s: any) => s.email.toLowerCase().trim()));

  // Deduplicate and filter recipients
  const seenEmails = new Set<string>();
  const validRecipients: RecipientInput[] = [];
  let suppressedCount = 0;

  for (const r of input.recipients) {
    const cleanEmail = (r.email || "").toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) continue;

    if (suppressedSet.has(cleanEmail)) {
      suppressedCount++;
      continue;
    }

    if (seenEmails.has(cleanEmail)) continue;
    seenEmails.add(cleanEmail);

    validRecipients.push({
      ...r,
      email: cleanEmail,
    });
  }

  if (validRecipients.length === 0) {
    throw new Error(
      suppressedCount > 0
        ? `All ${suppressedCount} recipients were skipped due to suppressions / unsubscribes.`
        : "No valid recipient email addresses provided."
    );
  }

  // Create campaign record
  const campaign = await db.outreach_campaigns.create({
    data: {
      user_id: userId,
      name: input.name.trim(),
      mode: input.mode,
      status: input.launchNow ? "running" : "draft",
      recipient_source: input.recipientSource,
      source_ref: {
        ...(input.sourceRef || {}),
        sender_address_footer: input.senderAddressFooter,
        sender_account_ids: validAccountIds,
        suppressed_filtered: suppressedCount,
      },
      subject_template: input.subjectTemplate,
      body_template: input.bodyTemplate,
      ai_config: input.aiConfig || null,
      openai_key_id: input.openaiKeyId || null,
      text_model: input.textModel || input.aiConfig?.textModel || "gpt-4o-mini",
      send_window: input.sendWindow || { startHour: 9, endHour: 18 },
      timezone: input.timezone || "UTC",
      jitter_min_sec: Math.max(input.jitterMinSec ?? 60, 30),
      jitter_max_sec: Math.min(input.jitterMaxSec ?? 180, 600),
      launched_at: input.launchNow ? new Date() : null,
    },
  });

  // Link accounts in outreach_campaign_accounts
  try {
    await db.outreach_campaign_accounts.createMany({
      data: validAccountIds.map((accId: string) => ({
        campaign_id: campaign.id,
        email_account_id: accId,
      })),
    });
  } catch (err) {
    logger.warn({ err }, "Could not bulk-insert campaign accounts (continuing)");
  }

  // Pre-assign accounts in round-robin and insert recipients with unguessable tokens
  const recipientRecords = validRecipients.map((rec, idx) => {
    const assignedAccountId = validAccountIds[idx % validAccountIds.length];
    const unguessableToken = randomBytes(16).toString("hex");

    return {
      user_id: userId,
      campaign_id: campaign.id,
      lead_id: rec.lead_id || null,
      email: rec.email,
      name: rec.name || null,
      company: rec.company || null,
      vars: {
        first_name: rec.name ? rec.name.split(" ")[0] : "",
        company_name: rec.company || "",
        website: rec.website || "",
        ...(rec.vars || {}),
      },
      assigned_account_id: assignedAccountId,
      status: "queued",
      unsubscribe_token: unguessableToken,
      attempts: 0,
    };
  });

  // Bulk save recipients
  await db.campaign_recipients.createMany({
    data: recipientRecords,
  });

  logger.info(
    {
      campaignId: campaign.id,
      recipients: recipientRecords.length,
      suppressed: suppressedCount,
      inboxes: validAccountIds.length,
    },
    "Created outreach campaign successfully"
  );

  return {
    campaign,
    recipientsCount: recipientRecords.length,
    suppressedCount,
    senderAccountsCount: validAccountIds.length,
  };
}

export async function getCampaignDetails(userId: string, campaignId: string) {
  const campaign = await db.outreach_campaigns.findFirst({
    where: { id: campaignId, user_id: userId },
  });

  if (!campaign) return null;

  // Load recipients
  const recipients = await db.campaign_recipients.findMany({
    where: { campaign_id: campaignId, user_id: userId },
    take: 150,
  });

  // Compute status metrics
  const total = await db.campaign_recipients.count({ where: { campaign_id: campaignId } });
  const queued = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "queued" } });
  const sent = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "sent" } });
  const replied = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "replied" } });
  const bounced = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "bounced" } });
  const unsubscribed = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "unsubscribed" } });
  const failed = await db.campaign_recipients.count({ where: { campaign_id: campaignId, status: "failed" } });

  // Load sender accounts
  const senderAccountIds: string[] = campaign.source_ref?.sender_account_ids || [];
  const senderAccounts = senderAccountIds.length > 0
    ? await db.email_accounts.findMany({
        where: { id: { in: senderAccountIds } },
      })
    : [];

  return {
    campaign,
    stats: {
      total,
      queued,
      sent,
      replied,
      bounced,
      unsubscribed,
      failed,
      replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0",
      bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0",
    },
    senderAccounts,
    recipients,
  };
}

export async function listCampaigns(userId: string) {
  const campaigns = await db.outreach_campaigns.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const campaignsWithStats = await Promise.all(
    campaigns.map(async (c: any) => {
      const total = await db.campaign_recipients.count({ where: { campaign_id: c.id } });
      const sent = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "sent" } });
      const replied = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "replied" } });
      return {
        ...c,
        totalRecipients: total,
        sentCount: sent,
        repliesCount: replied,
      };
    })
  );

  return campaignsWithStats;
}

export async function updateCampaignStatus(
  userId: string,
  campaignId: string,
  status: "draft" | "running" | "paused" | "completed" | "cancelled"
) {
  const campaign = await db.outreach_campaigns.findFirst({
    where: { id: campaignId, user_id: userId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  const updated = await db.outreach_campaigns.update({
    where: { id: campaignId },
    data: {
      status,
      launched_at: status === "running" && !campaign.launched_at ? new Date() : campaign.launched_at,
    },
  });

  return updated;
}

export async function deleteCampaign(userId: string, campaignId: string) {
  const campaign = await db.outreach_campaigns.findFirst({
    where: { id: campaignId, user_id: userId },
  });

  if (!campaign) {
    throw new Error("Campaign not found");
  }

  await db.outreach_campaigns.delete({
    where: { id: campaignId },
  });

  return { id: campaignId };
}
