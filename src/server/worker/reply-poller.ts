import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/server/db";
import { logger } from "@/server/logger";
import { getDecryptedAccountCredentials } from "@/server/email/account-service";

/**
 * Polls active IMAP inboxes for replies and bounces.
 * Immediately stops followup sequence when a reply is detected.
 * Optimized for 1 vCPU VPS with short timeouts and fast socket cleanup.
 */
export async function pollInboxesForReplies(): Promise<{ checked: number; repliesFound: number; bouncesFound: number }> {
  const activeAccounts = await db.email_accounts.findMany({
    where: { status: "active" },
  });

  let checkedCount = 0;
  let repliesFound = 0;
  let bouncesFound = 0;

  for (const account of activeAccounts) {
    if (!account.imap_host) continue;

    checkedCount++;
    let client: ImapFlow | null = null;

    try {
      const creds = await getDecryptedAccountCredentials(account.id);
      if (!creds || !creds.imap_host) continue;

      client = new ImapFlow({
        host: creds.imap_host,
        port: creds.imap_port || 993,
        secure: creds.imap_security === "ssl" || creds.imap_port === 993,
        auth: {
          user: creds.imap_username || account.from_email,
          pass: creds.imap_password,
        },
        logger: false,
      });

      // Strict timeout (8 seconds)
      const connectPromise = client.connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("IMAP Connection timeout")), 8000)
      );
      await Promise.race([connectPromise, timeoutPromise]);

      const lock = await client.getMailboxLock("INBOX");

      try {
        // Fetch last 20 messages to keep memory tiny
        const status = await client.status("INBOX", { messages: true });
        const totalMsgs = (status && typeof status === "object" && status.messages) ? status.messages : 0;
        if (totalMsgs > 0) {
          const fetchRange = `${Math.max(1, totalMsgs - 19)}:*`;

          for await (const message of client.fetch(fetchRange, { envelope: true, source: true })) {
            try {
              const envelope = message.envelope;
              if (!envelope) continue;
              if (!message.source) continue;

              const fromAddress = envelope.from?.[0]?.address?.toLowerCase().trim();
              const inReplyTo = envelope.inReplyTo || "";
              const subject = envelope.subject || "";

              if (!fromAddress) continue;

              // Check for Bounce (mailer-daemon / postmaster)
              const isBounce =
                fromAddress.includes("mailer-daemon") ||
                fromAddress.includes("postmaster") ||
                subject.toLowerCase().includes("delivery status notification") ||
                subject.toLowerCase().includes("undeliverable");

              if (isBounce) {
                // Try to find recipient by parsing message body
                const parsed = await (simpleParser as any)(message.source);
                const bounceBody = parsed.text || "";
                // Look for recipient email in bounce message
                const emailMatch = bounceBody.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (emailMatch) {
                  const bouncedEmail = emailMatch[0].toLowerCase();
                  const rec = await db.campaign_recipients.findFirst({
                    where: { email: bouncedEmail, assigned_account_id: account.id },
                  });
                  if (rec && rec.status !== "bounced") {
                    await db.campaign_recipients.update({
                      where: { id: rec.id },
                      data: { status: "bounced", error: "Delivery failed / bounced" },
                    });
                    // Suppress future emails
                    await db.suppressions.create({
                      data: {
                        user_id: rec.user_id,
                        email: bouncedEmail,
                        reason: "bounced",
                        source_campaign_id: rec.campaign_id,
                      },
                    });
                    bouncesFound++;
                  }
                }
                continue;
              }

              // Match against campaign recipients
              // Match condition: fromAddress matches recipient email AND was sent from this account
              const matchingRecipient = await db.campaign_recipients.findFirst({
                where: {
                  email: fromAddress,
                  assigned_account_id: account.id,
                },
              });

              if (matchingRecipient) {
                if (matchingRecipient.status !== "replied") {
                  // Mark as replied (STOP-ON-REPLY enforced!)
                  await db.campaign_recipients.update({
                    where: { id: matchingRecipient.id },
                    data: {
                      status: "replied",
                      replied_at: new Date(),
                    },
                  });

                  // Record incoming email message
                  const parsed = await (simpleParser as any)(message.source);
                  await db.email_messages.create({
                    data: {
                      user_id: matchingRecipient.user_id,
                      recipient_id: matchingRecipient.id,
                      email_account_id: account.id,
                      direction: "in",
                      kind: "reply",
                      message_id: envelope.messageId || `reply_${Date.now()}`,
                      in_reply_to: inReplyTo,
                      subject: subject,
                      snippet: (parsed.text || "").slice(0, 150),
                      status: "received",
                      sent_at: envelope.date || new Date(),
                    },
                  });

                  repliesFound++;
                  logger.info(
                    {
                      email: fromAddress,
                      campaignId: matchingRecipient.campaign_id,
                      accountId: account.id,
                    },
                    "Detected reply from recipient, stop-on-reply activated"
                  );
                }
              }
            } catch (msgErr) {
              // Ignore single message parse error
            }
          }
        }
      } finally {
        lock.release();
      }

      await db.email_accounts.update({
        where: { id: account.id },
        data: { last_polled_at: new Date() },
      });
    } catch (err: unknown) {
      logger.warn(
        { accountId: account.id, error: err instanceof Error ? err.message : err },
        "Error polling IMAP inbox"
      );
    } finally {
      if (client) {
        try {
          await client.logout();
        } catch {}
      }
    }
  }

  return { checked: checkedCount, repliesFound, bouncesFound };
}
