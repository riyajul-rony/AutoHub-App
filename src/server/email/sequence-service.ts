import nodemailer from "nodemailer";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { decrypt } from "@/server/crypto";
import { getDecryptedAccountCredentials } from "@/server/email/account-service";
import { renderEmailTemplate } from "@/server/email/template-renderer";
import { getUserApiKey } from "@/server/api-keys/service";
import { generateOutreachEmail } from "@/server/ai/outreach-generator";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";

export interface FollowupStep {
  step_no: number;
  delay_days: number;
  mode: "custom" | "ai";
  subject_template?: string;
  body_template?: string;
  ai_instruction?: string;
}

export async function getCampaignSequence(campaignId: string) {
  const existing = await db.followup_sequences.findFirst({
    where: { campaign_id: campaignId },
  });

  if (existing) {
    return existing;
  }

  // Return default 2-step followup blueprint
  return {
    campaign_id: campaignId,
    status: "active",
    steps: [
      {
        step_no: 1,
        delay_days: 3,
        mode: "custom",
        subject_template: "Re: {{previous_subject}}",
        body_template:
          "Hi {{first_name|there}},\n\nJust floating this to the top of your inbox in case you missed my earlier email regarding {{company_name|your business}}.\n\nDo you have 5 minutes for a quick chat this week?\n\nBest regards,\nAlex",
      },
      {
        step_no: 2,
        delay_days: 5,
        mode: "custom",
        subject_template: "Re: {{previous_subject}}",
        body_template:
          "Hi {{first_name|there}},\n\nI understand you might be busy, so this will be my final follow-up. If this isn't relevant for {{company_name|your team}} right now, no worries at all!\n\nWishing you all the best,\nAlex",
      },
    ],
  };
}

export async function saveCampaignSequence(
  userId: string,
  campaignId: string,
  name: string,
  steps: FollowupStep[]
) {
  if (steps.length > 5) {
    throw new Error("Maximum of 5 followup steps allowed per sequence");
  }

  // Ensure steps have valid step_no and delay_days
  const sanitizedSteps = steps.map((s, idx) => ({
    step_no: idx + 1,
    delay_days: Math.max(Number(s.delay_days) || 1, 1),
    mode: s.mode || "custom",
    subject_template: s.subject_template || "Re: {{previous_subject}}",
    body_template: s.body_template || "Hi {{first_name|there}},\n\nJust following up on my previous note.",
    ai_instruction: s.ai_instruction || null,
  }));

  const saved = await db.followup_sequences.create({
    data: {
      user_id: userId,
      campaign_id: campaignId,
      name: name || `Sequence for Campaign ${campaignId.slice(0, 8)}`,
      status: "active",
      steps: sanitizedSteps as any,
    },
  });

  logger.info({ campaignId, stepsCount: sanitizedSteps.length }, "Saved campaign followup sequence");
  return saved;
}

/**
 * Dispatches a single scheduled follow-up step for an eligible recipient.
 * Adheres strictly to stop-on-reply, 25/hr rate cap, suppression check, and thread headers.
 */
export async function sendSingleRecipientFollowup(
  recipientId: string,
  now: Date = new Date()
) {
  const recipient = await db.campaign_recipients.findFirst({
    where: { id: recipientId },
  });

  if (!recipient) {
    return { skipped: true, reason: "Recipient not found" };
  }

  // Strict stop-on-reply / suppression check: only "sent" leads can receive follow-ups
  if (recipient.status !== "sent") {
    return {
      skipped: true,
      reason: `Recipient status is ${recipient.status} (only 'sent' status receives followups)`,
    };
  }

  const campaign = await db.outreach_campaigns.findFirst({
    where: { id: recipient.campaign_id },
  });

  if (!campaign || campaign.status !== "running") {
    return { skipped: true, reason: "Campaign is not running" };
  }

  // Find active sequence
  const sequence = await db.followup_sequences.findFirst({
    where: { campaign_id: campaign.id, status: "active" },
  });

  if (!sequence || !Array.isArray(sequence.steps) || sequence.steps.length === 0) {
    return { skipped: true, reason: "No active followup sequence configured" };
  }

  const currentStep = recipient.current_step || 0;
  const nextStepNo = currentStep + 1;
  const step = sequence.steps.find((s: FollowupStep) => s.step_no === nextStepNo);

  if (!step) {
    return { skipped: true, reason: "All sequence steps completed for recipient" };
  }

  // Delay verification
  const delayDays = Math.max(Number(step.delay_days) || 1, 1);
  const delayMs = delayDays * 24 * 60 * 60 * 1000;
  const referenceDate = recipient.last_sent_at || recipient.sent_at || recipient.created_at;

  if (referenceDate) {
    const dueTime = new Date(new Date(referenceDate).getTime() + delayMs);
    if (now.getTime() < dueTime.getTime()) {
      return {
        skipped: true,
        reason: `Followup step ${nextStepNo} due at ${dueTime.toISOString()}`,
      };
    }
  }

  // 1. Check suppression list
  const suppression = await db.suppressions.findFirst({
    where: { user_id: recipient.user_id, email: recipient.email.toLowerCase() },
  });

  if (suppression) {
    await db.campaign_recipients.update({
      where: { id: recipient.id },
      data: { status: "unsubscribed", error: "Suppression match" },
    });
    return { skipped: true, reason: "Suppressed" };
  }

  // 2. Fetch assigned sender account & check 25/hr rate cap
  if (!recipient.assigned_account_id) {
    return { skipped: true, reason: "No assigned sender email account" };
  }

  const account = await db.email_accounts.findFirst({
    where: { id: recipient.assigned_account_id },
  });

  if (!account || account.status !== "active") {
    return { skipped: true, reason: "Assigned sender account is not active" };
  }

  const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const sentLastHour = await db.email_messages.count({
    where: {
      email_account_id: account.id,
      sent_at: { gte: sixtyMinutesAgo },
      status: "sent",
    },
  });

  const hourlyCap = Math.min(account.hourly_limit || 25, 25);
  if (sentLastHour >= hourlyCap) {
    logger.warn(
      { accountId: account.id, sentLastHour, hourlyCap },
      "Account reached hourly limit, postponing followup"
    );
    return { throttled: true, reason: "Hourly limit reached" };
  }

  // 3. Render Subject and Body
  const unsubscribeUrl = `${BASE_URL}/u/${recipient.unsubscribe_token}`;
  const legalAddress =
    campaign.source_ref?.sender_address_footer ||
    account.signature ||
    "AutoHub Verified Cold Outreach";

  let finalSubject = "";
  let finalBody = "";

  try {
    if (step.mode === "ai") {
      let rawApiKey = "";
      if (campaign.openai_key_id) {
        const keyRecord = await db.api_keys.findFirst({
          where: { id: campaign.openai_key_id, user_id: recipient.user_id },
        });
        if (keyRecord?.key_enc) {
          try {
            rawApiKey = decrypt(keyRecord.key_enc);
          } catch {}
        }
      }
      if (!rawApiKey) {
        rawApiKey = (await getUserApiKey(recipient.user_id, "openai")) || "";
      }

      if (rawApiKey) {
        try {
          const generated = await generateOutreachEmail({
            apiKey: rawApiKey,
            senderName: account.from_name || account.from_email,
            recipientName: recipient.name || undefined,
            recipientCompany: recipient.company || undefined,
            recipientWebsite: recipient.vars?.website || undefined,
            goalOrOffer: step.ai_instruction || campaign.ai_config?.goalOrOffer,
            tone: campaign.ai_config?.tone || "conversational",
            textModel: campaign.text_model || campaign.ai_config?.textModel,
          });
          const rawSubj = generated.subject || "Quick follow-up";
          finalSubject = rawSubj.startsWith("Re:") ? rawSubj : `Re: ${rawSubj}`;
          finalBody = generated.body;
        } catch {
          // Fallback if AI generation encounters issue
          finalSubject = renderEmailTemplate(
            step.subject_template || "Re: {{previous_subject}}",
            { ...recipient.vars, previous_subject: recipient.generated_subject || "our conversation" }
          );
          finalBody = renderEmailTemplate(
            step.body_template || "Hi {{first_name|there}},\n\nJust floating this to the top of your inbox.",
            recipient.vars || {}
          );
        }
      } else {
        finalSubject = renderEmailTemplate(
          step.subject_template || "Re: {{previous_subject}}",
          { ...recipient.vars, previous_subject: recipient.generated_subject || "our conversation" }
        );
        finalBody = renderEmailTemplate(
          step.body_template || "Hi {{first_name|there}},\n\nJust floating this to the top of your inbox.",
          recipient.vars || {}
        );
      }
    } else {
      // Custom Template Mode
      finalSubject = renderEmailTemplate(
        step.subject_template || "Re: {{previous_subject}}",
        { ...recipient.vars, previous_subject: recipient.generated_subject || "our conversation" },
        unsubscribeUrl
      );
      finalBody = renderEmailTemplate(
        step.body_template || "Hi {{first_name|there}},\n\nJust floating this to the top of your inbox.",
        recipient.vars || {},
        unsubscribeUrl
      );
    }

    const emailFooter = `\n\n---\n${legalAddress}\nTo unsubscribe: ${unsubscribeUrl}`;
    const fullBodyText = finalBody + emailFooter;

    // 4. Send via nodemailer with Threading Headers
    const creds = await getDecryptedAccountCredentials(account.id);
    if (!creds || !creds.smtp_host) {
      throw new Error("Invalid SMTP credentials for account");
    }

    const transport = nodemailer.createTransport({
      host: creds.smtp_host,
      port: creds.smtp_port || 587,
      secure: creds.smtp_security === "ssl" || creds.smtp_port === 465,
      auth: {
        user: creds.smtp_username || account.from_email,
        pass: creds.smtp_password,
      },
      connectionTimeout: 8000,
      greetingTimeout: 6000,
      socketTimeout: 10000,
    });

    const threadHeader = recipient.thread_message_id || undefined;

    const sendResult = await transport.sendMail({
      from: `"${account.from_name || account.from_email}" <${account.from_email}>`,
      to: recipient.email,
      replyTo: account.reply_to || account.from_email,
      subject: finalSubject,
      text: fullBodyText,
      headers: {
        ...(threadHeader ? { "In-Reply-To": threadHeader, References: threadHeader } : {}),
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-AutoHub-Campaign-Id": campaign.id,
        "X-AutoHub-Recipient-Id": recipient.id,
        "X-AutoHub-Step-No": String(step.step_no),
      },
    });

    transport.close();

    const messageId = sendResult.messageId || `msg_followup_${Date.now()}`;

    // 5. Record message and update recipient step
    await db.email_messages.create({
      data: {
        user_id: recipient.user_id,
        recipient_id: recipient.id,
        email_account_id: account.id,
        direction: "out",
        kind: "followup",
        step_no: step.step_no,
        message_id: messageId,
        in_reply_to: threadHeader || null,
        subject: finalSubject,
        snippet: finalBody.slice(0, 150),
        status: "sent",
        sent_at: now,
      },
    });

    const nextStep = sequence.steps.find((s: FollowupStep) => s.step_no === step.step_no + 1);
    const nextFollowupAt = nextStep
      ? new Date(now.getTime() + (Number(nextStep.delay_days) || 1) * 86400000)
      : null;

    await db.campaign_recipients.update({
      where: { id: recipient.id },
      data: {
        current_step: step.step_no,
        last_sent_at: now,
        next_followup_at: nextFollowupAt,
      },
    });

    logger.info(
      {
        recipientId: recipient.id,
        email: recipient.email,
        stepNo: step.step_no,
        messageId,
      },
      "Follow-up email dispatched successfully"
    );

    return { success: true, messageId, stepNo: step.step_no };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send followup email";
    logger.error(
      { err, recipientId: recipient.id, stepNo: step.step_no },
      "Failed to dispatch followup email"
    );
    return { success: false, error: errorMsg };
  }
}

/**
 * Periodic dispatch loop: Finds running campaigns with active sequences and dispatches due followups.
 */
export async function dispatchDueFollowups(
  now: Date = new Date()
): Promise<{ dispatched: number; throttled: number; skipped: number }> {
  const runningCampaigns = await db.outreach_campaigns.findMany({
    where: { status: "running" },
  });

  let totalDispatched = 0;
  let totalThrottled = 0;
  let totalSkipped = 0;

  for (const campaign of runningCampaigns) {
    try {
      // Check send window
      const currentHour = now.getUTCHours();
      const startHour = campaign.send_window?.startHour ?? 0;
      const endHour = campaign.send_window?.endHour ?? 24;

      if (currentHour < startHour || currentHour >= endHour) {
        continue;
      }

      // Check active sequence
      const sequence = await db.followup_sequences.findFirst({
        where: { campaign_id: campaign.id, status: "active" },
      });

      if (!sequence || !Array.isArray(sequence.steps) || sequence.steps.length === 0) {
        continue;
      }

      const eligibleRecipients = await db.campaign_recipients.findMany({
        where: { campaign_id: campaign.id, status: "sent" },
        take: 20,
      });

      for (const rec of eligibleRecipients) {
        const currentStep = rec.current_step || 0;
        if (currentStep >= sequence.steps.length) {
          continue;
        }

        const res = await sendSingleRecipientFollowup(rec.id, now);
        if (res && "success" in res && res.success) {
          totalDispatched++;
        } else if (res && "throttled" in res && res.throttled) {
          totalThrottled++;
        } else {
          totalSkipped++;
        }
      }
    } catch (err) {
      logger.error({ err, campaignId: campaign.id }, "Error in followup dispatch loop");
    }
  }

  return { dispatched: totalDispatched, throttled: totalThrottled, skipped: totalSkipped };
}
