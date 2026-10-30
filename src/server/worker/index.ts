import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES, queueSocialPublish } from "@/server/queues";
import { db } from "@/server/db";
import { computePlannerRuns, isMissed } from "@/server/services/social/schedule";
import { decrypt } from "@/server/crypto";
import { getUserApiKey } from "@/server/api-keys/service";
import { generateSocialPost } from "@/server/ai/social-generator";
import { getSocialProvider } from "@/server/providers/social/registry";
import { logger } from "@/server/logger";
import { dispatchRunningCampaigns, sendSingleRecipientEmail } from "@/server/email/sending-engine";
import { dispatchDueFollowups } from "@/server/email/sequence-service";
import { pollInboxesForReplies } from "@/server/worker/reply-poller";
import { trackUsageIncrement, resetOrArchiveOldUsageCounters } from "@/server/billing/usage-tracker";
import { processSubscriptionLifecycles } from "@/server/billing/lifecycle";
import { recordErrorLog } from "@/server/logging/error-logger";
import { cleanupOldLogs } from "@/server/logging/cleaner";

/**
 * 1. PLANNER WORKER: runs every minute, computes scheduled runs from DB campaigns
 */
export function startPlannerWorker() {
  return new Worker(
    QUEUE_NAMES.PLANNER,
    async () => {
      const now = new Date();
      logger.info({ at: now.toISOString() }, "Planner tick starting");

      const activeCampaigns = await db.social_campaigns.findMany({
        where: { status: "active" },
        include: { social_account: true, openai_key: true },
      });

      for (const campaign of activeCampaigns) {
        try {
          const { due } = computePlannerRuns(
            {
              postTimes: campaign.post_times,
              daysOfWeek: campaign.days_of_week,
              timezone: campaign.timezone,
              startDate: campaign.start_date ? campaign.start_date.toISOString().slice(0, 10) : null,
              endDate: campaign.end_date ? campaign.end_date.toISOString().slice(0, 10) : null,
            },
            now
          );

          const upsertOps = due.map((scheduledFor) => {
            const missed = isMissed(scheduledFor, now);
            return db.post_runs.upsert({
              where: {
                campaign_id_scheduled_for: {
                  campaign_id: campaign.id,
                  scheduled_for: scheduledFor,
                },
              },
              create: {
                user_id: campaign.user_id,
                campaign_id: campaign.id,
                scheduled_for: scheduledFor,
                status: missed ? "skipped" : "scheduled",
                error_message: missed ? "Missed run grace period exceeded" : null,
              },
              update: {},
            });
          });

          if (upsertOps.length > 0) {
            await db.$transaction(upsertOps);
          }
        } catch (err) {
          logger.error({ err, campaignId: campaign.id }, "Failed to plan campaign runs");
        }
      }

      // Enqueue any runs that are currently due
      try {
        const dueRuns = await db.post_runs.findMany({
          where: {
            status: "scheduled",
            scheduled_for: { lte: now },
          },
        });

        for (const run of dueRuns) {
          await queueSocialPublish(run.id);
        }
      } catch (err) {
        logger.error({ err }, "Failed to dispatch due post runs to BullMQ queue");
      }
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );
}

/**
 * 2. SOCIAL PUBLISH WORKER: executes scheduled post runs
 */
export function startSocialPublishWorker() {
  return new Worker(
    QUEUE_NAMES.SOCIAL_PUBLISH,
    async (job) => {
      const { postRunId } = job.data as { postRunId: string };
      logger.info({ postRunId }, "Processing social publish job");

      const postRun = await db.post_runs.findUnique({
        where: { id: postRunId },
        include: {
          campaign: {
            include: { social_account: true, openai_key: true },
          },
        },
      });

      if (!postRun || postRun.status === "published" || postRun.status === "rejected") {
        return;
      }

      const campaign = postRun.campaign;
      const account = campaign.social_account;

      // Multi-tenant security check: ensure account belongs to campaign owner
      if (account.user_id !== campaign.user_id || postRun.user_id !== campaign.user_id) {
        const err = new Error("Tenant isolation violation: account or post run does not match campaign user");
        logger.error({ postRunId, userId: postRun.user_id }, err.message);
        await db.post_runs.update({
          where: { id: postRun.id },
          data: { status: "failed", error_message: err.message },
        });
        throw err;
      }

      // Transition to generating
      await db.post_runs.update({
        where: { id: postRun.id },
        data: { status: "generating", started_at: new Date() },
      });

      try {
        let fullCaption = postRun.caption || "";
        let hashtags = postRun.hashtags || [];
        let imagePrompt = postRun.image_prompt || "";
        let imageUrl = postRun.external_url || undefined;

        // 1. Generate post content if not already generated
        if (!fullCaption) {
          let rawApiKey = "";
          if (campaign.openai_key) {
            rawApiKey = decrypt(campaign.openai_key.key_enc);
          } else {
            const userKey = await getUserApiKey(campaign.user_id, "openai");
            if (userKey) rawApiKey = userKey;
          }

          if (!rawApiKey) {
            throw new Error("No OpenAI API key found for this user. Please configure your OpenAI API Key in Settings -> API Keys.");
          }

          // Fetch recent post captions to avoid repetition
          const recentRuns = await db.post_runs.findMany({
            where: { campaign_id: campaign.id, status: "published" },
            orderBy: { scheduled_for: "desc" },
            take: 15,
            select: { caption: true },
          });

          const generated = await generateSocialPost({
            apiKey: rawApiKey,
            businessName: campaign.business_name,
            businessCategory: campaign.business_category,
            businessDescription: campaign.business_description,
            targetAudience: campaign.target_audience,
            brandVoice: campaign.brand_voice,
            language: campaign.language,
            prompt: campaign.prompt,
            imageStyle: campaign.image_style,
            captionLength: campaign.caption_length as any,
            includeEmojis: campaign.emojis,
            hashtagsCount: campaign.hashtags_count,
            ctaText: campaign.cta_text,
            recentCaptions: (recentRuns || []).map((r: any) => r.caption || "").filter(Boolean),
            textModel: campaign.text_model,
            imageModel: campaign.image_model,
          });

          fullCaption = `${generated.caption}\n\n${generated.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`.trim();
          hashtags = generated.hashtags;
          imagePrompt = generated.imagePrompt;
          if (generated.imageUrl) imageUrl = generated.imageUrl;
        }

        // 2. Check approval mode
        if (campaign.approval_mode === "approve" && postRun.status !== "publishing") {
          await db.post_runs.update({
            where: { id: postRun.id },
            data: {
              status: "pending_approval",
              caption: fullCaption,
              hashtags,
              image_prompt: imagePrompt,
              external_url: imageUrl,
            },
          });
          logger.info({ postRunId }, "Post generated and queued for user approval");
          return;
        }

        // 3. Auto mode or approved: publish immediately
        await db.post_runs.update({
          where: { id: postRun.id },
          data: { status: "publishing" },
        });

        const provider = getSocialProvider(account.provider);
        const accountToken = account.access_token_enc ? decrypt(account.access_token_enc) : "";

        const result = await provider.publish(accountToken, account.external_id, {
          caption: fullCaption,
          imageUrl,
        });

        await db.post_runs.update({
          where: { id: postRun.id },
          data: {
            status: "published",
            caption: fullCaption,
            hashtags,
            image_prompt: imagePrompt,
            external_post_id: result.externalId,
            external_url: result.url || imageUrl,
            finished_at: new Date(),
          },
        });

        trackUsageIncrement(postRun.user_id, "monthly_social_posts", 1).catch(() => null);

        logger.info({ postRunId, externalId: result.externalId }, "Post successfully published");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown publish error";
        logger.error({ err, postRunId }, "Post run failed");

        recordErrorLog({
          source: "worker:social_publish",
          message: errorMsg,
          stack: err instanceof Error ? err.stack : undefined,
          context: { postRunId },
          userId: postRun.user_id,
        }).catch(() => null);

        await db.post_runs.update({
          where: { id: postRun.id },
          data: {
            status: "failed",
            error_message: errorMsg,
            attempts: { increment: 1 },
          },
        });
        throw err;
      }
    },
    { connection: getRedisConnection(), concurrency: 2 }
  );
}

/**
 * 3. EMAIL DISPATCH WORKER: checks running campaigns, rate limits, and triggers sends
 */
export function startEmailDispatchWorker() {
  return new Worker(
    QUEUE_NAMES.EMAIL_DISPATCH,
    async () => {
      logger.info("Email dispatch worker tick starting");
      const result = await dispatchRunningCampaigns();
      const followupResult = await dispatchDueFollowups();
      logger.info({ initialDispatches: result, followupDispatches: followupResult }, "Email dispatch tick completed");
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );
}

/**
 * 4. EMAIL SEND WORKER: sends a single recipient email with 25/hr cap & jitter
 */
export function startEmailSendWorker() {
  return new Worker(
    QUEUE_NAMES.EMAIL_SEND,
    async (job) => {
      const { recipientId } = job.data as { recipientId: string };
      logger.info({ recipientId }, "Processing email send job");
      try {
        return await sendSingleRecipientEmail(recipientId);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Email send failed";
        recordErrorLog({
          source: "worker:email_send",
          message: errorMsg,
          stack: err instanceof Error ? err.stack : undefined,
          context: { recipientId, jobId: job.id },
        }).catch(() => null);
        throw err;
      }
    },
    { connection: getRedisConnection(), concurrency: 3 }
  );
}

/**
 * 5. REPLY POLL WORKER: checks IMAP inboxes for replies and bounces, triggers stop-on-reply
 */
export function startReplyPollWorker() {
  return new Worker(
    QUEUE_NAMES.REPLY_POLL,
    async () => {
      logger.info("IMAP reply poll worker tick starting");
      const result = await pollInboxesForReplies();
      logger.info(result, "IMAP reply poll tick completed");
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );
}

/**
 * 6. MAINTENANCE WORKER: periodic cleanup of archived usage counters & expired data
 */
export function startMaintenanceWorker() {
  return new Worker(
    QUEUE_NAMES.MAINTENANCE,
    async () => {
      logger.info("Maintenance worker tick starting");
      const result = await resetOrArchiveOldUsageCounters();
      const lifecycleResult = await processSubscriptionLifecycles();
      const purgeResult = await cleanupOldLogs(90);
      logger.info(
        { archivedCounters: result, lifecycles: lifecycleResult, purgedLogs: purgeResult },
        "Maintenance tick completed (archived counters, processed lifecycles & purged 90d logs)"
      );
    },
    { connection: getRedisConnection(), concurrency: 1 }
  );
}

import { startLeadSearchWorker } from "./lead-search-worker";

/**
 * Initializes and starts all Lead Reach AI background workers:
 * 1. Planner (computes scheduled social runs)
 * 2. Social Publish (executes social media posts)
 * 3. Email Dispatch (outreach loop & followup sequences)
 * 4. Email Send (transports single recipient emails)
 * 5. Reply Poll (IMAP inboxes for stop-on-reply & bounces)
 * 6. Maintenance (archives old usage counters)
 * 7. Lead Search (scrapes, enriches & deduplicates leads)
 */
export function startAllWorkers() {
  logger.info("Starting all Lead Reach AI background workers...");
  const planner = startPlannerWorker();
  const social = startSocialPublishWorker();
  const emailDispatch = startEmailDispatchWorker();
  const emailSend = startEmailSendWorker();
  const replyPoll = startReplyPollWorker();
  const maintenance = startMaintenanceWorker();
  const leadSearch = startLeadSearchWorker();

  logger.info("All 7 Lead Reach AI background workers are active.");
  return { planner, social, emailDispatch, emailSend, replyPoll, maintenance, leadSearch };
}


