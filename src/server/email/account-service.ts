import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { logger } from "@/server/logger";

export interface SmtpConfig {
  host: string;
  port: number;
  security?: "ssl" | "tls" | "starttls" | "none";
  username?: string;
  password?: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  security?: "ssl" | "tls" | "starttls" | "none";
  username: string;
  password?: string;
}

export interface CreateEmailAccountInput {
  label: string;
  from_name: string;
  from_email: string;
  reply_to?: string;
  signature?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_security?: string;
  smtp_username: string;
  smtp_password?: string;
  imap_host: string;
  imap_port: number;
  imap_security?: string;
  imap_username?: string;
  imap_password?: string;
  hourly_limit?: number;
  daily_limit?: number;
}

/**
 * Live test of SMTP connection and authentication handshake.
 * Strict 7s timeout to prevent hanging on slow servers.
 */
export async function testSmtpConnection(
  config: SmtpConfig
): Promise<{ ok: boolean; message?: string; error?: string }> {
  const secure = config.security === "ssl" || config.port === 465;

  const transporter = nodemailer.createTransport({
    host: config.host.trim(),
    port: Number(config.port),
    secure,
    auth:
      config.username && config.password
        ? {
            user: config.username.trim(),
            pass: config.password,
          }
        : undefined,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 7000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });

  try {
    await transporter.verify();
    transporter.close();
    return { ok: true, message: "SMTP connection & authentication successful!" };
  } catch (err: any) {
    try {
      transporter.close();
    } catch {}
    logger.warn({ host: config.host, port: config.port, err: err.message }, "SMTP verify failed");
    return { ok: false, error: err.message || "Failed to connect to SMTP server." };
  }
}

/**
 * Live test of IMAP connection and INBOX handshake.
 * Strict 7s timeout.
 */
export async function testImapConnection(
  config: ImapConfig
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!config.username || !config.password) {
    return { ok: false, error: "IMAP username and password are required." };
  }

  const secure = config.security === "ssl" || config.port === 993;

  const client = new ImapFlow({
    host: config.host.trim(),
    port: Number(config.port),
    secure,
    auth: {
      user: config.username.trim(),
      pass: config.password,
    },
    logger: false,
    connectionTimeout: 7000,
    greetingTimeout: 5000,
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    lock.release();
    await client.logout();
    return { ok: true, message: "IMAP connection & INBOX access successful!" };
  } catch (err: any) {
    try {
      await client.logout();
    } catch {}
    logger.warn({ host: config.host, port: config.port, err: err.message }, "IMAP verify failed");
    return { ok: false, error: err.message || "Failed to connect to IMAP server." };
  }
}

/**
 * Create a new sender email account with AES-256 encrypted passwords.
 * Hard rate limit cap enforced at 25/hr as per spec 5.6.
 */
export async function createEmailAccount(userId: string, input: CreateEmailAccountInput) {
  const hourlyCap = Math.min(Math.max(input.hourly_limit ?? 25, 1), 25);
  const dailyCap = Math.min(Math.max(input.daily_limit ?? 150, 1), 500);

  const smtpPassEnc = input.smtp_password ? encrypt(input.smtp_password) : null;
  const imapPass = input.imap_password || input.smtp_password;
  const imapPassEnc = imapPass ? encrypt(imapPass) : null;
  const imapUser = input.imap_username || input.smtp_username;

  const created = await db.email_accounts.create({
    data: {
      user_id: userId,
      label: input.label.trim(),
      from_name: input.from_name?.trim() || null,
      from_email: input.from_email.toLowerCase().trim(),
      reply_to: input.reply_to?.toLowerCase().trim() || null,
      signature: input.signature?.trim() || null,
      smtp_host: input.smtp_host.trim(),
      smtp_port: Number(input.smtp_port),
      smtp_security: input.smtp_security || "tls",
      smtp_username: input.smtp_username.trim(),
      smtp_password_enc: smtpPassEnc,
      imap_host: input.imap_host.trim(),
      imap_port: Number(input.imap_port),
      imap_security: input.imap_security || "ssl",
      imap_username: imapUser?.trim() || null,
      imap_password_enc: imapPassEnc,
      hourly_limit: hourlyCap,
      daily_limit: dailyCap,
      status: "active",
    },
  });

  return sanitizeAccount(created);
}

/**
 * List all email accounts for a user with current usage metrics.
 */
export async function listEmailAccounts(userId: string) {
  const accounts = await db.email_accounts.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Compute live sent counts
  return Promise.all(
    accounts.map(async (acc: any) => {
      let sentLastHour = 0;
      let sentToday = 0;
      try {
        if (db.email_messages?.count) {
          sentLastHour = await db.email_messages.count({
            where: {
              email_account_id: acc.id,
              sent_at: { gte: oneHourAgo },
              status: "sent",
            },
          });
          sentToday = await db.email_messages.count({
            where: {
              email_account_id: acc.id,
              sent_at: { gte: startOfDay },
              status: "sent",
            },
          });
        }
      } catch {}

      return {
        ...sanitizeAccount(acc),
        sentLastHour,
        sentToday,
      };
    })
  );
}

/**
 * Delete an email account.
 */
export async function deleteEmailAccount(userId: string, accountId: string) {
  await db.email_accounts.delete({
    where: { id: accountId, user_id: userId },
  });
  return { ok: true };
}

/**
 * Decrypt account passwords for internal sending/worker use.
 */
export async function getDecryptedAccountCredentials(accountId: string) {
  const account = await db.email_accounts.findUnique({
    where: { id: accountId },
  });
  if (!account) return null;

  return {
    ...account,
    smtp_password: account.smtp_password_enc ? decrypt(account.smtp_password_enc) : "",
    imap_password: account.imap_password_enc ? decrypt(account.imap_password_enc) : "",
  };
}

function sanitizeAccount(acc: any) {
  const { smtp_password_enc, imap_password_enc, ...rest } = acc;
  return {
    ...rest,
    has_smtp_password: Boolean(smtp_password_enc),
    has_imap_password: Boolean(imap_password_enc),
  };
}
