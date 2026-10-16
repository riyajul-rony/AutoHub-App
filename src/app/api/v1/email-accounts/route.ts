import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  listEmailAccounts,
  createEmailAccount,
  testSmtpConnection,
  testImapConnection,
} from "@/server/email/account-service";
import { assertLimit } from "@/server/billing/limits";
import { z } from "zod";

const createAccountSchema = z.object({
  label: z.string().min(1, "Account label is required"),
  from_name: z.string().min(1, "Sender name is required"),
  from_email: z.string().email("Valid sender email is required"),
  reply_to: z.string().email("Valid reply-to email").optional().or(z.literal("")),
  signature: z.string().optional(),
  smtp_host: z.string().min(1, "SMTP host is required"),
  smtp_port: z.coerce.number().min(1).max(65535),
  smtp_security: z.enum(["ssl", "tls", "starttls", "none"]).default("tls"),
  smtp_username: z.string().min(1, "SMTP username is required"),
  smtp_password: z.string().min(1, "SMTP password is required"),
  imap_host: z.string().min(1, "IMAP host is required"),
  imap_port: z.coerce.number().min(1).max(65535),
  imap_security: z.enum(["ssl", "tls", "starttls", "none"]).default("ssl"),
  imap_username: z.string().optional().or(z.literal("")),
  imap_password: z.string().optional().or(z.literal("")),
  hourly_limit: z.coerce.number().min(1).max(25).default(25),
  daily_limit: z.coerce.number().min(1).max(500).default(150),
  validate_before_save: z.boolean().default(false),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const accounts = await listEmailAccounts(session.user.id);
    return NextResponse.json({ data: accounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list email accounts" }, { status: 500 });
  }
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createAccountSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
  }

  const input = parsed.data;

  // Optional live validation before saving
  if (input.validate_before_save) {
    const smtpCheck = await testSmtpConnection({
      host: input.smtp_host,
      port: input.smtp_port,
      security: input.smtp_security,
      username: input.smtp_username,
      password: input.smtp_password,
    });
    if (!smtpCheck.ok) {
      return NextResponse.json({ error: `SMTP check failed: ${smtpCheck.error}` }, { status: 400 });
    }

    const imapCheck = await testImapConnection({
      host: input.imap_host,
      port: input.imap_port,
      security: input.imap_security,
      username: input.imap_username || input.smtp_username,
      password: input.imap_password || input.smtp_password,
    });
    if (!imapCheck.ok) {
      return NextResponse.json({ error: `IMAP check failed: ${imapCheck.error}` }, { status: 400 });
    }
  }

  // Enforce plan quota for email accounts
  try {
    await assertLimit(session.user.id, "max_email_accounts", 1);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  try {
    const account = await createEmailAccount(session.user.id, input as any);
    return NextResponse.json({ data: account, message: "Email account connected successfully" }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create email account" }, { status: 500 });
  }
}
