import { Worker } from "bullmq";
import { getRedisConnection, QUEUE_NAMES } from "@/server/queues";
import { db } from "@/server/db";
import { computePlannerRuns, isMissed } from "@/server/services/social/schedule";
import { decrypt } from "@/server/crypto";
import { generateSocialPost } from "@/server/ai/social-generator";
import { getSocialProvider } from "@/server/providers/social/registry";
import { logger } from "@/server/logger";

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

          for (const scheduledFor of due) {
            // Idempotent insertion
            const missed = isMissed(scheduledFor, now);
            await db.post_runs.upsert({
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
          }
        } catch (err) {
          logger.error({ err, campaignId: campaign.id }, "Failed to plan campaign runs");
        }
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

      // Transition to generating
      await db.post_runs.update({
        where: { id: postRun.id },
        data: { status: "generating", started_at: new Date() },
      });

      try {
        if (!campaign.openai_key) {
          throw new Error("No OpenAI API key connected to campaign");
        }

        const rawApiKey = decrypt(campaign.openai_key.key_enc);

        // Fetch recent post captions to avoid repetition
        const recentRuns = await db.post_runs.findMany({
          where: { campaign_id: campaign.id, status: "published" },
          orderBy: { scheduled_for: "desc" },
          take: 15,
          select: { caption: true },
        });

        // 1. Generate post content
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

        const fullCaption = `${generated.caption}\n\n${generated.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}`.trim();

        // 2. Check approval mode
        if (campaign.approval_mode === "approve") {
          await db.post_runs.update({
            where: { id: postRun.id },
            data: {
              status: "pending_approval",
              caption: fullCaption,
              hashtags: generated.hashtags,
              image_prompt: generated.imagePrompt,
              external_url: generated.imageUrl,
            },
          });
          logger.info({ postRunId }, "Post generated and queued for user approval");
          return;
        }

        // 3. Auto mode: publish immediately
        await db.post_runs.update({
          where: { id: postRun.id },
          data: { status: "publishing" },
        });

        const provider = getSocialProvider(account.provider);
        const accountToken = account.access_token_enc ? decrypt(account.access_token_enc) : "";

        const result = await provider.publish(accountToken, account.external_id, {
          caption: fullCaption,
          imageUrl: generated.imageUrl,
        });

        await db.post_runs.update({
          where: { id: postRun.id },
          data: {
            status: "published",
            caption: fullCaption,
            hashtags: generated.hashtags,
            image_prompt: generated.imagePrompt,
            external_post_id: result.externalId,
            external_url: result.url || generated.imageUrl,
            finished_at: new Date(),
          },
        });

        logger.info({ postRunId, externalId: result.externalId }, "Post successfully published");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown publish error";
        logger.error({ err, postRunId }, "Post run failed");

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
