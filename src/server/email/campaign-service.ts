import { randomBytes } from "node:crypto";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { assertLimit } from "@/server/billing/limits";
import { saveCampaignSequence } from "@/server/email/sequence-service";
import { queueEmailDispatch } from "@/server/queues";

export interface RecipientInput {
  email: string;
  name?: string;
  company?: string;
  website?: string;
  lead_id?: string;
  vars?: Record<string, any>;
}

export interface AccountAllocationInput {
  accountId: string;
  leadCount: number;
  dailyLimit?: number;
  minWaitMinutes?: number;
  maxWaitMinutes?: number;
}

export interface CreateCampaignStepInput {
  step_no: number;
  delay_days: number;
  subject?: string;
  body: string;
  same_thread?: boolean;
}

export interface CreateCampaignInput {
  name: string;
  mode: "ai" | "custom";
  senderAccountIds: string[];
  recipientSource: "leads" | "sheet" | "csv" | "manual";
  sourceRef?: any;
  recipients: RecipientInput[];
  subjectTemplate?: string;
  bodyTemplate?: string;
  steps?: CreateCampaignStepInput[];
  presetMode?: "safe" | "balanced" | "aggressive";
  daysOfWeek?: number[];
  trackingOpen?: boolean;
  trackingClick?: boolean;
  dailyLeadLimit?: number;
  previewApproved?: boolean;
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
  accountAllocations?: AccountAllocationInput[];
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
      tracking_open: Boolean(input.trackingOpen),
      tracking_click: Boolean(input.trackingClick),
      preset_mode: input.presetMode || "balanced",
      days_of_week: input.daysOfWeek && input.daysOfWeek.length > 0 ? input.daysOfWeek : [1, 2, 3, 4, 5],
      daily_lead_limit: input.dailyLeadLimit || null,
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

  // Save follow-up sequence steps if provided
  if (input.steps && Array.isArray(input.steps) && input.steps.length > 0) {
    try {
      await saveCampaignSequence(
        userId,
        campaign.id,
        `${input.name} Sequence`,
        input.steps.map((s, idx) => ({
          step_no: s.step_no || idx + 1,
          delay_days: s.delay_days || 3,
          mode: input.mode,
          subject_template: s.same_thread ? "Re: {{previous_subject}}" : (s.subject || "Re: {{previous_subject}}"),
          body_template: s.body,
        }))
      );
    } catch (seqErr) {
      logger.warn({ seqErr, campaignId: campaign.id }, "Could not save sequence via saveCampaignSequence");
    }

    try {
      if (db.campaign_steps?.createMany) {
        await db.campaign_steps.createMany({
          data: input.steps.map((s, idx) => ({
            campaign_id: campaign.id,
            step_no: s.step_no || idx + 1,
            delay_days: s.delay_days || 3,
            mode: input.mode,
            subject_template: s.same_thread ? "Re: {{previous_subject}}" : (s.subject || "Re: {{previous_subject}}"),
            body_template: s.body,
          })),
        });
      }
    } catch {}
  }

  // Update email accounts sending limits if provided in allocations
  if (input.accountAllocations && Array.isArray(input.accountAllocations)) {
    for (const alloc of input.accountAllocations) {
      if (alloc.accountId && (alloc.dailyLimit || alloc.minWaitMinutes || alloc.maxWaitMinutes)) {
        try {
          const updateData: any = {};
          if (alloc.dailyLimit) updateData.daily_limit = Math.min(Math.max(alloc.dailyLimit, 5), 500);
          if (alloc.minWaitMinutes) {
            updateData.min_gap_seconds = Math.max(Math.round(alloc.minWaitMinutes * 60), 30);
            updateData.gap_seconds = updateData.min_gap_seconds;
          }
          if (alloc.maxWaitMinutes) {
            updateData.max_gap_seconds = Math.max(
              Math.round(alloc.maxWaitMinutes * 60),
              updateData.min_gap_seconds || 30
            );
          }
          await db.email_accounts.update({
            where: { id: alloc.accountId },
            data: updateData,
          });
        } catch {}
      }
    }
  }

  // Build assigned accounts list based on allocated lead counts (or fallback to round-robin)
  const assignedAccountList: string[] = [];
  if (input.accountAllocations && Array.isArray(input.accountAllocations)) {
    for (const alloc of input.accountAllocations) {
      if (validAccountIds.includes(alloc.accountId)) {
        const count = Math.max(0, Math.floor(alloc.leadCount || 0));
        for (let i = 0; i < count; i++) {
          assignedAccountList.push(alloc.accountId);
        }
      }
    }
  }

  // Pre-assign accounts in round-robin and insert recipients with unguessable tokens
  const recipientRecords = validRecipients.map((rec, idx) => {
    const assignedAccountId = assignedAccountList[idx] || validAccountIds[idx % validAccountIds.length];
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
      preview_approved: input.previewApproved ?? true,
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

  if (input.launchNow) {
    queueEmailDispatch(campaign.id).catch((err) => {
      logger.warn({ err, campaignId: campaign.id }, "Could not enqueue launch dispatch job");
    });
  }

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
  const opened = await db.campaign_recipients.count({ where: { campaign_id: campaignId, open_count: { gt: 0 } } });
  const clicked = await db.campaign_recipients.count({ where: { campaign_id: campaignId, click_count: { gt: 0 } } });

  // Load sender accounts
  const senderAccountIds: string[] = campaign.source_ref?.sender_account_ids || [];
  const senderAccounts = senderAccountIds.length > 0
    ? await db.email_accounts.findMany({
        where: { id: { in: senderAccountIds } },
      })
    : [];

  // Load campaign steps
  let steps: any[] = [];
  try {
    if (db.campaign_steps?.findMany) {
      steps = await db.campaign_steps.findMany({
        where: { campaign_id: campaignId },
        orderBy: { step_no: "asc" },
      });
    }
  } catch {}

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
      opened,
      clicked,
      replyRate: sent > 0 ? ((replied / sent) * 100).toFixed(1) : "0.0",
      bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : "0.0",
      openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : "0.0",
      clickRate: sent > 0 ? ((clicked / sent) * 100).toFixed(1) : "0.0",
    },
    senderAccounts,
    recipients,
    steps,
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
      const queued = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "queued" } });
      const sent = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "sent" } });
      const replied = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "replied" } });
      const bounced = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "bounced" } });
      const unsubscribed = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "unsubscribed" } });
      const failed = await db.campaign_recipients.count({ where: { campaign_id: c.id, status: "failed" } });
      const opened = await db.campaign_recipients.count({ where: { campaign_id: c.id, open_count: { gt: 0 } } });

      return {
        ...c,
        totalRecipients: total,
        queuedCount: queued,
        sentCount: sent,
        repliesCount: replied,
        bouncedCount: bounced,
        unsubscribedCount: unsubscribed,
        failedCount: failed,
        openedCount: opened,
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

  if (status === "running") {
    queueEmailDispatch(campaignId).catch((err) => {
      logger.warn({ err, campaignId }, "Could not enqueue dispatch job on status update");
    });
  }

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
