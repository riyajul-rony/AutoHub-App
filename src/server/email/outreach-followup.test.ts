import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { decrypt } from "@/server/crypto";
import {
  createEmailAccount,
  listEmailAccounts,
  getDecryptedAccountCredentials,
  deleteEmailAccount,
} from "@/server/email/account-service";
import {
  createOutreachCampaign,
  getCampaignDetails,
} from "@/server/email/campaign-service";
import {
  sendSingleRecipientEmail,
  dispatchRunningCampaigns,
} from "@/server/email/sending-engine";
import {
  saveCampaignSequence,
  getCampaignSequence,
  sendSingleRecipientFollowup,
  dispatchDueFollowups,
} from "@/server/email/sequence-service";
import * as AccountsRoute from "@/app/api/v1/email-accounts/route";
import * as SingleAccountRoute from "@/app/api/v1/email-accounts/[id]/route";
import * as CampaignsRoute from "@/app/api/v1/outreach/campaigns/route";
import * as SingleCampaignRoute from "@/app/api/v1/outreach/campaigns/[id]/route";
import * as SequenceRoute from "@/app/api/v1/outreach/campaigns/[id]/sequence/route";
import * as UnsubscribeRoute from "@/app/api/v1/unsubscribe/[token]/route";

// Track sent mail arguments in mock
export const sentMailMock = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      verify: vi.fn().mockResolvedValue(true),
      sendMail: async (mailOptions: any) => {
        sentMailMock(mailOptions);
        return {
          messageId: `<mock-${Date.now()}@autohub.io>`,
          accepted: [mailOptions.to],
        };
      },
      close: vi.fn(),
    })),
  },
}));

// Mock user session
const mockSession = vi.fn();
vi.mock("@/server/auth/session", () => ({
  getSessionUser: () => mockSession(),
  requireUser: async () => {
    const s = await mockSession();
    if (!s) throw new Error("Unauthorized");
    return s.user;
  },
}));

describe("Phase 6: Cold Email Outreach & Followup Sequence Automation", () => {
  const tenant1 = {
    sessionId: "sess-tenant1",
    user: {
      id: "33333333-3333-3333-3333-333333333333",
      email: "tenant1@autohub.io",
      role: "user",
    },
  };

  const tenant2 = {
    sessionId: "sess-tenant2",
    user: {
      id: "44444444-4444-4444-4444-444444444444",
      email: "tenant2@autohub.io",
      role: "user",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Email Account Management & AES-256-GCM Encryption", () => {
    it("creates an email account with encrypted credentials and strictly enforces 25/hr cap", async () => {
      mockSession.mockResolvedValue(tenant1);

      const rawPassword = "super_secret_smtp_pass_123";
      const account = await createEmailAccount(tenant1.user.id, {
        label: "Primary Google Workspace",
        from_name: "Riyajul from AutoHub",
        from_email: "riyajul@autohub.io",
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        smtp_security: "tls",
        smtp_username: "riyajul@autohub.io",
        smtp_password: rawPassword,
        imap_host: "imap.gmail.com",
        imap_port: 993,
        imap_security: "ssl",
        hourly_limit: 100, // Attempt to set >25, should be capped to 25
        daily_limit: 150,
      });

      expect(account.id).toBeDefined();
      expect(account.from_email).toBe("riyajul@autohub.io");
      expect(account.hourly_limit).toBe(25); // Spec 5.6 hard cap
      expect((account as any).smtp_password_enc).toBeUndefined(); // Never exposed to client
      expect(account.has_smtp_password).toBe(true);

      // Verify DB storage has encrypted password
      const savedInDb = await db.email_accounts.findUnique({
        where: { id: account.id },
      });
      expect(savedInDb.smtp_password_enc).toBeDefined();
      expect(savedInDb.smtp_password_enc).not.toBe(rawPassword);
      expect(decrypt(savedInDb.smtp_password_enc)).toBe(rawPassword);

      // Verify internal decrypted credentials loader
      const creds = await getDecryptedAccountCredentials(account.id);
      expect(creds?.smtp_password).toBe(rawPassword);
    });

    it("prevents User 2 from deleting or accessing User 1's email accounts via API", async () => {
      mockSession.mockResolvedValue(tenant1);

      const acc1 = await createEmailAccount(tenant1.user.id, {
        label: "Tenant 1 Account",
        from_name: "Tenant 1",
        from_email: "t1@domain.com",
        smtp_host: "smtp.mail.com",
        smtp_port: 587,
        smtp_username: "t1@domain.com",
        smtp_password: "pw1",
        imap_host: "imap.mail.com",
        imap_port: 993,
      });

      // Tenant 2 tries to access/delete Tenant 1's account
      mockSession.mockResolvedValue(tenant2);

      const testReq = new NextRequest(`http://localhost:3000/api/v1/email-accounts/${acc1.id}`, {
        method: "POST",
      });
      const testRes = await SingleAccountRoute.POST(testReq, {
        params: Promise.resolve({ id: acc1.id }),
      });
      expect(testRes.status).toBe(404);

      // Tenant 2 listing accounts should only show their own
      const listReq = new NextRequest("http://localhost:3000/api/v1/email-accounts");
      const listRes = await AccountsRoute.GET();
      const listBody = await listRes.json();
      expect(listBody.data.find((a: any) => a.id === acc1.id)).toBeUndefined();
    });
  });

  describe("2. Campaign Creation & Suppression Filtering", () => {
    it("filters out suppressed emails and pre-assigns accounts with 32-char hex unsubscribe tokens", async () => {
      mockSession.mockResolvedValue(tenant1);

      // 1. Create two sender accounts for round-robin rotation
      const accA = await createEmailAccount(tenant1.user.id, {
        label: "Account A",
        from_name: "Sender A",
        from_email: "a@domain.com",
        smtp_host: "smtp.a.com",
        smtp_port: 587,
        smtp_username: "a@domain.com",
        smtp_password: "pass",
        imap_host: "imap.a.com",
        imap_port: 993,
      });

      const accB = await createEmailAccount(tenant1.user.id, {
        label: "Account B",
        from_name: "Sender B",
        from_email: "b@domain.com",
        smtp_host: "smtp.b.com",
        smtp_port: 587,
        smtp_username: "b@domain.com",
        smtp_password: "pass",
        imap_host: "imap.b.com",
        imap_port: 993,
      });

      // 2. Add an email to suppression list
      await db.suppressions.create({
        data: {
          user_id: tenant1.user.id,
          email: "suppressed@target.com",
          reason: "unsubscribed",
        },
      });

      // 3. Create outreach campaign with 4 recipients (1 suppressed, 1 duplicate, 2 valid)
      const result = await createOutreachCampaign(tenant1.user.id, {
        name: "Dhaka Dental Clinics Outreach",
        mode: "custom",
        senderAccountIds: [accA.id, accB.id],
        recipientSource: "manual",
        subjectTemplate: "Question regarding {{company_name}}",
        bodyTemplate: "Hi {{first_name}},\n\nWanted to connect about {{company_name}}.",
        timezone: "Asia/Dhaka",
        senderAddressFooter: "AutoHub Inc, 123 Tech Blvd, Suite 400",
        recipients: [
          { email: "lead1@target.com", name: "Karim Ahmed", company: "Karim Dental" },
          { email: "suppressed@target.com", name: "Should Skip", company: "Skipped Inc" },
          { email: "lead1@target.com", name: "Karim Duplicate", company: "Karim Dental" },
          { email: "lead2@target.com", name: "Rahim Khan", company: "Rahim Clinic" },
        ],
      });

      expect(result.suppressedCount).toBe(1);
      expect(result.recipientsCount).toBe(2);

      // Check stored recipients
      const recipients = await db.campaign_recipients.findMany({
        where: { campaign_id: result.campaign.id },
      });
      expect(recipients.length).toBe(2);

      // Verify unguessable 32-character unsubscribe tokens
      for (const rec of recipients) {
        expect(rec.unsubscribe_token).toHaveLength(32);
        expect(rec.status).toBe("queued");
      }

      // Verify round-robin assignment across accA and accB
      const assignedIds = recipients.map((r: any) => r.assigned_account_id);
      expect(assignedIds).toContain(accA.id);
      expect(assignedIds).toContain(accB.id);
    });
  });

  describe("3. Sending Engine & 25/hr Rate Limit Hard Cap", () => {
    it("dispatches initial email with compliance headers, footer, and records message", async () => {
      mockSession.mockResolvedValue(tenant1);

      const senderAcc = await createEmailAccount(tenant1.user.id, {
        label: "Sender Account",
        from_name: "Alex",
        from_email: "alex@agency.com",
        smtp_host: "smtp.agency.com",
        smtp_port: 587,
        smtp_username: "alex@agency.com",
        smtp_password: "password123",
        imap_host: "imap.agency.com",
        imap_port: 993,
      });

      const campResult = await createOutreachCampaign(tenant1.user.id, {
        name: "Test Dispatch Campaign",
        mode: "custom",
        senderAccountIds: [senderAcc.id],
        recipientSource: "manual",
        subjectTemplate: "Quick partnership idea for {{company_name}}",
        bodyTemplate: "Hello {{first_name}},\n\nWould love to collaborate.",
        senderAddressFooter: "AutoHub Global Corp, Tower 4, Singapore",
        timezone: "UTC",
        recipients: [
          { email: "prospect@acme.com", name: "John Doe", company: "Acme Corp" },
        ],
      });

      const campaign = campResult.campaign;
      await db.outreach_campaigns.update({
        where: { id: campaign.id },
        data: { status: "running" },
      });

      const recipient = await db.campaign_recipients.findFirst({
        where: { campaign_id: campaign.id },
      });

      const sendResult = await sendSingleRecipientEmail(recipient.id);
      expect(sendResult).toHaveProperty("success", true);

      // Verify nodemailer was called with correct headers
      expect(sentMailMock).toHaveBeenCalledTimes(1);
      const callArgs = sentMailMock.mock.calls[0][0];

      expect(callArgs.to).toBe("prospect@acme.com");
      expect(callArgs.subject).toBe("Quick partnership idea for Acme Corp");
      expect(callArgs.text).toContain("Hello John,");
      expect(callArgs.text).toContain("AutoHub Global Corp, Tower 4, Singapore");
      expect(callArgs.text).toContain(`/u/${recipient.unsubscribe_token}`);
      expect(callArgs.headers["List-Unsubscribe"]).toBe(`<http://localhost:3000/u/${recipient.unsubscribe_token}>`);
      expect(callArgs.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

      // Verify recipient updated
      const updatedRec = await db.campaign_recipients.findFirst({
        where: { id: recipient.id },
      });
      expect(updatedRec.status).toBe("sent");
      expect(updatedRec.thread_message_id).toBeDefined();

      // Verify message logged in email_messages
      const loggedMessages = await db.email_messages.findMany({
        where: { recipient_id: recipient.id },
      });
      expect(loggedMessages.length).toBe(1);
      expect(loggedMessages[0].direction).toBe("out");
      expect(loggedMessages[0].kind).toBe("initial");
    });

    it("throttles sending when sender account reaches the 25/hour hard limit", async () => {
      mockSession.mockResolvedValue(tenant1);

      const senderAcc = await createEmailAccount(tenant1.user.id, {
        label: "Capped Sender Account",
        from_name: "Alex",
        from_email: "capped@agency.com",
        smtp_host: "smtp.agency.com",
        smtp_port: 587,
        smtp_username: "capped@agency.com",
        smtp_password: "password123",
        imap_host: "imap.agency.com",
        imap_port: 993,
        hourly_limit: 25,
      });

      const camp = await db.outreach_campaigns.create({
        data: {
          user_id: tenant1.user.id,
          name: "Throttled Campaign",
          mode: "custom",
          status: "running",
          subject_template: "Hello",
          body_template: "World",
        },
      });

      const recipient = await db.campaign_recipients.create({
        data: {
          user_id: tenant1.user.id,
          campaign_id: camp.id,
          email: "target25@domain.com",
          assigned_account_id: senderAcc.id,
          status: "queued",
          unsubscribe_token: "testtoken_rate_cap_123456789012",
        },
      });

      // Simulate 25 emails already sent from this account in the last 15 minutes
      const now = new Date();
      for (let i = 0; i < 25; i++) {
        await db.email_messages.create({
          data: {
            user_id: tenant1.user.id,
            email_account_id: senderAcc.id,
            direction: "out",
            kind: "initial",
            message_id: `msg_rate_${i}`,
            status: "sent",
            sent_at: new Date(now.getTime() - 15 * 60 * 1000),
          },
        });
      }

      sentMailMock.mockClear();
      const throttleResult = await sendSingleRecipientEmail(recipient.id);
      expect(throttleResult).toEqual({ throttled: true, reason: "Hourly limit reached" });
      expect(sentMailMock).not.toHaveBeenCalled();

      // Recipient remains in queued state for next cycle
      const uneditedRec = await db.campaign_recipients.findFirst({
        where: { id: recipient.id },
      });
      expect(uneditedRec.status).toBe("queued");
    });
  });

  describe("4. Follow-up Sequence Engine, Threading, and Stop-on-Reply", () => {
    it("saves multi-step sequence and delivers Step 1 only after delay period has passed", async () => {
      mockSession.mockResolvedValue(tenant1);

      const senderAcc = await createEmailAccount(tenant1.user.id, {
        label: "Followup Sender",
        from_name: "Followup Bot",
        from_email: "followup@company.com",
        smtp_host: "smtp.company.com",
        smtp_port: 587,
        smtp_username: "followup@company.com",
        smtp_password: "password123",
        imap_host: "imap.company.com",
        imap_port: 993,
      });

      const camp = await db.outreach_campaigns.create({
        data: {
          user_id: tenant1.user.id,
          name: "3-Step Followup Campaign",
          mode: "custom",
          status: "running",
          subject_template: "Original Proposal for {{company_name}}",
          body_template: "Initial email",
        },
      });

      // Attach 2-step sequence
      await saveCampaignSequence(tenant1.user.id, camp.id, "Followup Blueprint", [
        {
          step_no: 1,
          delay_days: 3,
          mode: "custom",
          subject_template: "Re: {{previous_subject}}",
          body_template: "Hi {{first_name}},\n\nJust bumping my previous note.",
        },
        {
          step_no: 2,
          delay_days: 4,
          mode: "custom",
          subject_template: "Re: {{previous_subject}}",
          body_template: "Hi {{first_name}},\n\nFinal follow-up.",
        },
      ]);

      const initialSentDate = new Date("2026-10-01T10:00:00Z");

      const recipient = await db.campaign_recipients.create({
        data: {
          user_id: tenant1.user.id,
          campaign_id: camp.id,
          email: "lead_followup@target.com",
          name: "Sarah Miller",
          company: "Miller Dental",
          assigned_account_id: senderAcc.id,
          status: "sent",
          current_step: 0,
          generated_subject: "Original Proposal for Miller Dental",
          thread_message_id: "<msg_initial_12345@company.com>",
          last_sent_at: initialSentDate,
          sent_at: initialSentDate,
          unsubscribe_token: "sarah_token_1234567890123456789",
          vars: {
            first_name: "Sarah",
            company_name: "Miller Dental",
          },
        },
      });

      // 1. Attempt dispatch at Day 2 (should be skipped because delay is 3 days)
      const day2Date = new Date("2026-10-03T10:00:00Z"); // 2 days later
      const skippedRes = await sendSingleRecipientFollowup(recipient.id, day2Date);
      expect(skippedRes).toHaveProperty("skipped", true);
      expect((skippedRes as any).reason).toContain("due at");

      // 2. Dispatch at Day 3.5 (should succeed!)
      sentMailMock.mockClear();
      const day4Date = new Date("2026-10-04T12:00:00Z"); // 3.1 days later
      const successRes = await sendSingleRecipientFollowup(recipient.id, day4Date);
      expect(successRes).toHaveProperty("success", true);
      expect(successRes).toHaveProperty("stepNo", 1);

      // Verify email threading headers
      expect(sentMailMock).toHaveBeenCalledTimes(1);
      const call = sentMailMock.mock.calls[0][0];
      expect(call.to).toBe("lead_followup@target.com");
      expect(call.subject).toBe("Re: Original Proposal for Miller Dental");
      expect(call.text).toContain("Hi Sarah,\n\nJust bumping my previous note.");
      expect(call.headers["In-Reply-To"]).toBe("<msg_initial_12345@company.com>");
      expect(call.headers["References"]).toBe("<msg_initial_12345@company.com>");
      expect(call.headers["X-AutoHub-Step-No"]).toBe("1");

      // Verify recipient updated to current_step: 1
      const updatedRec = await db.campaign_recipients.findFirst({
        where: { id: recipient.id },
      });
      expect(updatedRec.current_step).toBe(1);
    });

    it("STOPS immediately and will never send followup when recipient has replied", async () => {
      mockSession.mockResolvedValue(tenant1);

      const camp = await db.outreach_campaigns.create({
        data: {
          user_id: tenant1.user.id,
          name: "Stop on Reply Campaign",
          status: "running",
        },
      });

      await saveCampaignSequence(tenant1.user.id, camp.id, "Seq", [
        { step_no: 1, delay_days: 1, mode: "custom" },
      ]);

      const repliedRecipient = await db.campaign_recipients.create({
        data: {
          user_id: tenant1.user.id,
          campaign_id: camp.id,
          email: "replied_lead@acme.com",
          status: "replied", // Status set to replied by IMAP worker!
          current_step: 0,
          unsubscribe_token: "replied_token_1234567890123456",
          last_sent_at: new Date(Date.now() - 10 * 86400000), // 10 days ago
        },
      });

      sentMailMock.mockClear();
      const res = await sendSingleRecipientFollowup(repliedRecipient.id);
      expect(res).toHaveProperty("skipped", true);
      expect((res as any).reason).toContain("only 'sent' status receives followups");
      expect(sentMailMock).not.toHaveBeenCalled();
    });
  });

  describe("5. Unsubscribe & Suppression Compliance", () => {
    it("processes unsubscribe via API and permanently suppresses recipient", async () => {
      const camp = await db.outreach_campaigns.create({
        data: {
          user_id: tenant1.user.id,
          name: "Unsubscribe Test Campaign",
          status: "running",
        },
      });

      const token = "unsub_token_unique_998877665544";
      const recipient = await db.campaign_recipients.create({
        data: {
          user_id: tenant1.user.id,
          campaign_id: camp.id,
          email: "optout@client.com",
          status: "sent",
          unsubscribe_token: token,
        },
      });

      // Call GET unsubscribe endpoint
      const req = new NextRequest(`http://localhost:3000/api/v1/unsubscribe/${token}`);
      const res = await UnsubscribeRoute.GET(req, {
        params: Promise.resolve({ token }),
      });
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.unsubscribed).toBe(true);
      expect(data.email).toBe("optout@client.com");

      // Verify recipient status
      const updatedRec = await db.campaign_recipients.findFirst({
        where: { id: recipient.id },
      });
      expect(updatedRec.status).toBe("unsubscribed");

      // Verify suppression record exists
      const suppression = await db.suppressions.findFirst({
        where: {
          user_id: tenant1.user.id,
          email: "optout@client.com",
        },
      });
      expect(suppression).toBeDefined();
      expect(suppression.reason).toBe("unsubscribed");
    });
  });
});
