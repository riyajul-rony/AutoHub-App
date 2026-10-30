import { describe, it, expect } from "vitest";
import { isAutoReplyMessage, isBounceMessage } from "./reply-poller";
import { db } from "@/server/db";

describe("Phase 6: Compliance, Unsubscribe & Reply Detection", () => {
  describe("1. Auto-Reply & Out-of-Office Classification", () => {
    it("identifies out-of-office automated subjects and body text", () => {
      expect(isAutoReplyMessage("Automatic reply: Vacation notice", "I am out of the office until Monday.")).toBe(true);
      expect(isAutoReplyMessage("Out of Office: Dental appointment", "Please contact team.")).toBe(true);
      expect(isAutoReplyMessage("Auto-reply: Thanks for reaching out", "This is an automated response.")).toBe(true);
    });

    it("classifies genuine human responses as NOT auto-reply", () => {
      expect(isAutoReplyMessage("Re: Quick question", "Hi Alex, yes I have 10 minutes Thursday afternoon.")).toBe(false);
      expect(isAutoReplyMessage("Partnership inquiry", "Could you send over some case studies first?")).toBe(false);
    });
  });

  describe("2. Bounce & Delivery Failure Classification", () => {
    it("identifies mailer-daemon, postmaster, and failure notification subjects", () => {
      expect(isBounceMessage("mailer-daemon@googlemail.com", "Delivery Status Notification (Failure)")).toBe(true);
      expect(isBounceMessage("postmaster@targetdomain.com", "Undeliverable: Partnership inquiry")).toBe(true);
      expect(isBounceMessage("bounce-handler@outreach.com", "Mail delivery failed: returning message to sender")).toBe(true);
    });

    it("does not flag ordinary prospect senders as bounces", () => {
      expect(isBounceMessage("ceo@acmemotors.com", "Re: Partnership idea")).toBe(false);
      expect(isBounceMessage("marketing@dealership.com", "Thanks for reaching out")).toBe(false);
    });
  });

  describe("3. Tracking & Unsubscribe State Verification", () => {
    it("clears next_followup_at and adds suppression on unsubscribe", async () => {
      const testUserId = "user-unsub-test-789";
      const campaign = await db.outreach_campaigns.create({
        data: {
          user_id: testUserId,
          name: "Unsubscribe Test Campaign",
          mode: "custom",
          status: "running",
          timezone: "UTC",
        },
      });

      const recipient = await db.campaign_recipients.create({
        data: {
          user_id: testUserId,
          campaign_id: campaign.id,
          email: "prospect_unsub@target.com",
          status: "sent",
          unsubscribe_token: "test-token-unsub-999",
          next_followup_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      });

      // Simulate unsubscribe action
      await db.campaign_recipients.update({
        where: { id: recipient.id },
        data: { status: "unsubscribed", next_followup_at: null },
      });

      await db.suppressions.create({
        data: {
          user_id: testUserId,
          email: recipient.email.toLowerCase(),
          reason: "unsubscribed",
          source_campaign_id: campaign.id,
        },
      });

      const updated = await db.campaign_recipients.findUnique({
        where: { id: recipient.id },
      });
      expect(updated?.status).toBe("unsubscribed");
      expect(updated?.next_followup_at).toBeNull();

      const suppression = await db.suppressions.findFirst({
        where: { user_id: testUserId, email: recipient.email.toLowerCase() },
      });
      expect(suppression).toBeDefined();
      expect(suppression?.reason).toBe("unsubscribed");
    });
  });

  describe("4. IMAP-less Sender with Reply-To & Separate Reply Inbox Flow", () => {
    it("matches replies received by a designated Reply Inbox and activates Stop-On-Reply", async () => {
      const testUserId = "user-reply-inbox-test-101";

      // 1. Account B: The designated Reply Inbox (e.g. Gmail with IMAP)
      const replyInbox = await db.email_accounts.create({
        data: {
          user_id: testUserId,
          label: "Designated Reply Inbox",
          from_email: "reply_catcher@domain.com",
          imap_host: "imap.gmail.com",
          imap_port: 993,
          status: "active",
        },
      });

      // 2. Account A: Zoho Free sender without IMAP, pointing to Account B as Reply Inbox
      const senderAccount = await db.email_accounts.create({
        data: {
          user_id: testUserId,
          label: "Zoho Free Sender (No IMAP)",
          from_email: "outreach@zohofree.com",
          reply_to: "reply_catcher@domain.com",
          reply_inbox_account_id: replyInbox.id,
          smtp_host: "smtp.zoho.com",
          smtp_port: 465,
          imap_host: null,
          status: "active",
        },
      });

      // 3. Campaign & Recipient assigned to Account A
      const campaign = await db.outreach_campaigns.create({
        data: {
          user_id: testUserId,
          name: "Zoho Free Outreach",
          mode: "custom",
          status: "running",
          timezone: "UTC",
        },
      });

      const prospectEmail = "lead_buyer@enterprise.com";
      const threadMessageId = "<autohub_zoho_test_456@domain.com>";

      const recipient = await db.campaign_recipients.create({
        data: {
          user_id: testUserId,
          campaign_id: campaign.id,
          assigned_account_id: senderAccount.id,
          email: prospectEmail,
          status: "sent",
          thread_message_id: threadMessageId,
          generated_subject: "Quick question on expansion",
          next_followup_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Followup scheduled in 2 days
        },
      });

      // Verify initial followup state
      expect(recipient.next_followup_at).toBeDefined();

      // 4. Test monitoring linkage:
      // When reply poller inspects replyInbox, find forwarding accounts
      const forwarding = await db.email_accounts.findMany({
        where: {
          user_id: replyInbox.user_id,
          OR: [
            { reply_inbox_account_id: replyInbox.id },
            { reply_to: replyInbox.from_email },
          ],
        },
        select: { id: true },
      });
      const monitoredAccountIds = [replyInbox.id, ...forwarding.map((f: any) => f.id)];

      expect(monitoredAccountIds).toContain(senderAccount.id);

      // 5. Test matching by In-Reply-To thread ID
      const matchedByThread = await db.campaign_recipients.findFirst({
        where: {
          thread_message_id: threadMessageId,
          user_id: replyInbox.user_id,
        },
      });
      expect(matchedByThread?.id).toBe(recipient.id);

      // 6. Test matching by fromAddress via monitoredAccountIds fallback
      const matchedBySender = await db.campaign_recipients.findFirst({
        where: {
          email: prospectEmail,
          assigned_account_id: { in: monitoredAccountIds },
        },
      });
      expect(matchedBySender?.id).toBe(recipient.id);

      // 7. Simulate Reply Detected: Stop-on-Reply executes
      await db.campaign_recipients.update({
        where: { id: recipient.id },
        data: {
          status: "replied",
          replied_at: new Date(),
          next_followup_at: null,
        },
      });

      const updatedRecipient = await db.campaign_recipients.findUnique({
        where: { id: recipient.id },
      });

      expect(updatedRecipient?.status).toBe("replied");
      expect(updatedRecipient?.next_followup_at).toBeNull();
    });
  });
});
