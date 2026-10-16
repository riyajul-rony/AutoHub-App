import nodemailer from "nodemailer";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { decrypt } from "@/server/crypto";
import { getDecryptedAccountCredentials } from "@/server/email/account-service";
import { getUserApiKey } from "@/server/api-keys/service";
import { renderEmailTemplate } from "@/server/email/template-renderer";
import { generateOutreachEmail } from "@/server/ai/outreach-generator";
import { assertLimit } from "@/server/billing/limits";
import { trackUsageIncrement } from "@/server/billing/usage-tracker";

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000";

/**
 * Sends a single email to a recipient, observing rate limits, headers, and suppressions.
 */
export async function sendSingleRecipientEmail(recipientId: string) {
  const recipient = await db.campaign_recipients.findFirst({
    where: { id: recipientId },
  });

  if (!recipient || recipient.status === "sent" || recipient.status === "unsubscribed") {
    return { skipped: true, reason: "Already processed or invalid" };
  }

  const campaign = await db.outreach_campaigns.findFirst({
    where: { id: recipient.campaign_id },
  });

  if (!campaign || campaign.status !== "running") {
    return { skipped: true, reason: "Campaign is not running" };
  }

  // Check plan limits
  try {
    await assertLimit(recipient.user_id, "monthly_outreach_emails", 1);
  } catch (err: any) {
    logger.warn({ recipientId, userId: recipient.user_id, err: err.message }, "Outreach quota exceeded");
    return { skipped: true, reason: err.message };
  }

  // 1. Double check suppression
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

  // 2. Fetch assigned sender account & verify 25/hr rate limit
  if (!recipient.assigned_account_id) {
    throw new Error("No assigned sender email account for recipient");
  }

  const account = await db.email_accounts.findFirst({
    where: { id: recipient.assigned_account_id },
  });

  if (!account || account.status !== "active") {
    throw new Error("Assigned sender email account is not active");
  }

  const sixtyMinutesAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sentLastHour = await db.email_messages.count({
    where: {
      email_account_id: account.id,
      sent_at: { gte: sixtyMinutesAgo },
      status: "sent",
    },
  });

  // Strict Spec 5.6 hard cap: never above 25/hour
  const hourlyCap = Math.min(account.hourly_limit || 25, 25);
  if (sentLastHour >= hourlyCap) {
    logger.warn(
      { accountId: account.id, sentLastHour, hourlyCap },
      "Account reached hourly sending limit, delaying send"
    );
    return { throttled: true, reason: "Hourly limit reached" };
  }

  // 3. Mark recipient as sending
  await db.campaign_recipients.update({
    where: { id: recipient.id },
    data: { status: "sending", sending_started_at: new Date() },
  });

  const unsubscribeUrl = `${BASE_URL}/u/${recipient.unsubscribe_token}`;
  const legalAddress =
    campaign.source_ref?.sender_address_footer ||
    account.signature ||
    "AutoHub Verified Cold Outreach";

  let finalSubject = "";
  let finalBody = "";

  try {
    // 4. Generate content
    if (campaign.mode === "ai") {
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
        const generated = await generateOutreachEmail({
          apiKey: rawApiKey,
          senderName: account.from_name,
          recipientName: recipient.name || undefined,
          recipientCompany: recipient.company || undefined,
          recipientWebsite: recipient.vars?.website || undefined,
          goalOrOffer: campaign.ai_config?.goalOrOffer,
          tone: campaign.ai_config?.tone,
          textModel: campaign.text_model || campaign.ai_config?.textModel,
        });
        finalSubject = generated.subject;
        finalBody = generated.body;
      } else {
        // Fallback if no OpenAI key connected
        finalSubject = renderEmailTemplate(
          campaign.subject_template || "Quick question for {{company_name|your business}}",
          recipient.vars || {}
        );
        finalBody = renderEmailTemplate(
          campaign.body_template || "Hi {{first_name|there}},\n\nWould love to connect.",
          recipient.vars || {}
        );
      }
    } else {
      // Custom Template Mode
      finalSubject = renderEmailTemplate(
        campaign.subject_template || "Hello {{company_name|there}}",
        recipient.vars || {},
        unsubscribeUrl
      );
      finalBody = renderEmailTemplate(
        campaign.body_template || "Hi {{first_name|there}},\n\nWould love to connect.",
        recipient.vars || {},
        unsubscribeUrl
      );
    }

    // Append standard compliant footer
    const emailFooter = `\n\n---\n${legalAddress}\nTo unsubscribe: ${unsubscribeUrl}`;
    const fullBodyText = finalBody + emailFooter;

    // 5. Connect and send via nodemailer
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

    const sendResult = await transport.sendMail({
      from: `"${account.from_name || account.from_email}" <${account.from_email}>`,
      to: recipient.email,
      replyTo: account.reply_to || account.from_email,
      subject: finalSubject,
      text: fullBodyText,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "X-AutoHub-Campaign-Id": campaign.id,
        "X-AutoHub-Recipient-Id": recipient.id,
      },
    });

    transport.close();

    const messageId = sendResult.messageId || `msg_${Date.now()}`;

    // 6. Record message and mark recipient as sent
    await db.email_messages.create({
      data: {
        user_id: recipient.user_id,
        recipient_id: recipient.id,
        email_account_id: account.id,
        direction: "out",
        kind: "initial",
        step_no: 0,
        message_id: messageId,
        subject: finalSubject,
        snippet: finalBody.slice(0, 150),
        status: "sent",
        sent_at: new Date(),
      },
    });

    await db.campaign_recipients.update({
      where: { id: recipient.id },
      data: {
        status: "sent",
        sent_at: new Date(),
        last_sent_at: new Date(),
        generated_subject: finalSubject,
        generated_body: finalBody,
        thread_message_id: messageId,
        attempts: (recipient.attempts || 0) + 1,
        error: null,
      },
    });

    logger.info(
      { recipientId: recipient.id, email: recipient.email, messageId },
      "Outreach email dispatched successfully"
    );

    trackUsageIncrement(recipient.user_id, "monthly_outreach_emails", 1).catch(() => null);

    return { success: true, messageId };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email";
    logger.error({ err, recipientId: recipient.id }, "Failed to send outreach email");

    await db.campaign_recipients.update({
      where: { id: recipient.id },
      data: {
        status: "failed",
        attempts: (recipient.attempts || 0) + 1,
        error: errorMsg,
      },
    });

    return { success: false, error: errorMsg };
  }
}

/**
 * Periodic dispatch loop: Finds running campaigns, picks queued leads within rate limits, and sends.
 */
export async function dispatchRunningCampaigns(): Promise<{ dispatched: number; throttled: number }> {
  const runningCampaigns = await db.outreach_campaigns.findMany({
    where: { status: "running" },
  });

  let totalDispatched = 0;
  let totalThrottled = 0;

  for (const campaign of runningCampaigns) {
    try {
      // Check send window
      const now = new Date();
      const currentHour = now.getUTCHours(); // or adjust timezone
      const startHour = campaign.send_window?.startHour ?? 0;
      const endHour = campaign.send_window?.endHour ?? 24;

      if (currentHour < startHour || currentHour >= endHour) {
        continue; // Outside sending window
      }

      // Pick next batch of queued recipients
      const queuedRecipients = await db.campaign_recipients.findMany({
        where: { campaign_id: campaign.id, status: "queued" },
        take: 10,
      });

      if (queuedRecipients.length === 0) {
        // Check if all are processed
        const pending = await db.campaign_recipients.count({
          where: { campaign_id: campaign.id, status: { in: ["queued", "sending"] } },
        });
        if (pending === 0) {
          const sequence = await db.followup_sequences.findFirst({
            where: { campaign_id: campaign.id, status: "active" },
          });
          const hasPendingFollowups = sequence && sequence.steps && sequence.steps.length > 0;
          if (!hasPendingFollowups) {
            await db.outreach_campaigns.update({
              where: { id: campaign.id },
              data: { status: "completed", completed_at: new Date() },
            });
          }
        }
        continue;
      }

      for (const rec of queuedRecipients) {
        const result = await sendSingleRecipientEmail(rec.id);
        if (result && "success" in result && result.success) {
          totalDispatched++;
        } else if (result && "throttled" in result && result.throttled) {
          totalThrottled++;
        }
      }
    } catch (err) {
      logger.error({ err, campaignId: campaign.id }, "Error in campaign dispatch loop");
    }
  }

  return { dispatched: totalDispatched, throttled: totalThrottled };
}
