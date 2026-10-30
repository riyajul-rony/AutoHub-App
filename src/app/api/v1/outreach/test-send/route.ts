import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getDecryptedAccountCredentials } from "@/server/email/account-service";
import { ensureFreshGoogleAccessToken, sendViaGmailApi } from "@/server/email/google-oauth";
import nodemailer from "nodemailer";
import { z } from "zod";

const testSendSchema = z.object({
  accountId: z.string().min(1, "Sender account is required"),
  toEmail: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  sampleData: z
    .object({
      name: z.string().optional(),
      first_name: z.string().optional(),
      company: z.string().optional(),
      company_name: z.string().optional(),
      website: z.string().optional(),
    })
    .optional(),
});

function renderPreviewText(template: string, data: Record<string, any>): string {
  let result = template;
  const firstName = data.first_name || data.name || "there";
  const company = data.company_name || data.company || "your business";
  const website = data.website || "your website";

  result = result.replace(/\{\{\s*first_name(?:\|[^}]+)?\s*\}\}/g, firstName);
  result = result.replace(/\{\{\s*name(?:\|[^}]+)?\s*\}\}/g, firstName);
  result = result.replace(/\{\{\s*company_name(?:\|[^}]+)?\s*\}\}/g, company);
  result = result.replace(/\{\{\s*company(?:\|[^}]+)?\s*\}\}/g, company);
  result = result.replace(/\{\{\s*website(?:\|[^}]+)?\s*\}\}/g, website);
  return result;
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = testSendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { accountId, toEmail, subject, body: emailBody, sampleData = {} } = parsed.data;

  const creds = await getDecryptedAccountCredentials(accountId);
  if (!creds || creds.user_id !== session.user.id) {
    return NextResponse.json({ error: "Sender email account not found" }, { status: 404 });
  }

  const renderedSubject = `[TEST PREVIEW] ` + renderPreviewText(subject, sampleData);
  const renderedBody =
    renderPreviewText(emailBody, sampleData) +
    `\n\n---\n[Test Preview sent from Lead Reach AI Outreach Wizard via ${creds.from_email}]`;

  // Offline / Test environment fallback
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return NextResponse.json({
      ok: true,
      messageId: `<mock-test-${Date.now()}@leadreachai.cerkitlabs.tech>`,
      message: `Test email simulated successfully to ${toEmail}.`,
    });
  }

  try {
    if (creds.provider_id === "gmail_api") {
      const accessToken = await ensureFreshGoogleAccessToken(accountId);
      const fromAddr = creds.from_name ? `"${creds.from_name}" <${creds.from_email}>` : creds.from_email;
      const result = await sendViaGmailApi(accessToken, {
        from: fromAddr,
        to: toEmail,
        subject: renderedSubject,
        text: renderedBody,
      });

      return NextResponse.json({
        ok: true,
        messageId: result.messageId,
        message: `Test email sent successfully via Gmail API to ${toEmail}!`,
      });
    }

    // SMTP send
    const transporter = nodemailer.createTransport({
      host: creds.smtp_host || "localhost",
      port: Number(creds.smtp_port) || 587,
      secure: creds.smtp_security === "ssl" || Number(creds.smtp_port) === 465,
      auth:
        creds.smtp_username && creds.smtp_password
          ? {
              user: creds.smtp_username,
              pass: creds.smtp_password,
            }
          : undefined,
      connectionTimeout: 8000,
      greetingTimeout: 5000,
    });

    const info = await transporter.sendMail({
      from: creds.from_name ? `"${creds.from_name}" <${creds.from_email}>` : creds.from_email,
      to: toEmail,
      subject: renderedSubject,
      text: renderedBody,
      headers: {
        "X-LeadReachAI-Test-Send": "true",
      },
    });

    transporter.close();

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      message: `Test email sent successfully via SMTP to ${toEmail}!`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to dispatch test email." },
      { status: 500 }
    );
  }
}
