import nodemailer from "nodemailer";
import { ImapFlow } from "imapflow";
import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { logger } from "@/server/logger";
import { checkDomainDnsHealth } from "@/server/email/dns-checker";

/**
 * Derive IMAP host/port/security from SMTP host.
 * Rules: smtp. → imap., smtppro. → imappro., else prefix imap. to domain.
 * Always port 993 SSL.
 */
export function deriveImapFromSmtp(smtpHost: string): {
  host: string;
  port: number;
  security: "ssl";
} {
  const h = smtpHost.trim().toLowerCase();
  let imapHost: string;
  if (h.startsWith("smtppro.")) {
    imapHost = h.replace(/^smtppro\./, "imappro.");
  } else if (h.startsWith("smtp.")) {
    imapHost = h.replace(/^smtp\./, "imap.");
  } else {
    // For hosts like mail.example.com, just use the same host for IMAP
    imapHost = h;
  }
  return { host: imapHost, port: 993, security: "ssl" };
}

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
  reply_inbox_account_id?: string;
  signature?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_security?: string;
  smtp_username?: string;
  smtp_password?: string;
  imap_host?: string;
  imap_port?: number;
  imap_security?: string;
  imap_username?: string;
  imap_password?: string;
  hourly_limit?: number;
  daily_limit?: number;
  gap_seconds?: number;
  min_gap_seconds?: number;
  max_gap_seconds?: number;
  timezone?: string;
  warmup_enabled?: boolean;
  warmup_day?: number;
  warmup_start_limit?: number;
  warmup_daily_increment?: number;
  warmup_max_limit?: number;
}

/**
 * Calculates the dynamic effective daily sending limit.
 * If warmup is active, limit starts small and ramps up daily until max cap.
 */
export function getEffectiveAccountDailyLimit(account: {
  daily_limit: number;
  warmup_enabled?: boolean | null;
  warmup_day?: number | null;
  warmup_start_limit?: number | null;
  warmup_daily_increment?: number | null;
  warmup_max_limit?: number | null;
}): number {
  if (!account.warmup_enabled) {
    return Math.min(account.daily_limit || 150, 500);
  }
  const day = Math.max(1, account.warmup_day || 1);
  const start = account.warmup_start_limit || 10;
  const inc = account.warmup_daily_increment || 5;
  const max = account.warmup_max_limit || 50;
  const calculated = start + (day - 1) * inc;
  return Math.min(calculated, max, account.daily_limit || 150);
}

function formatSmtpError(err: any, host: string = ""): string {
  const msg = err?.message || String(err);
  const code = err?.code || "";
  const responseCode = err?.responseCode || 0;
  const h = (host || "").toLowerCase();
  const lowerMsg = msg.toLowerCase();

  const isAuth =
    code === "EAUTH" ||
    responseCode === 535 ||
    lowerMsg.includes("badcredentials") ||
    lowerMsg.includes("username and password not accepted") ||
    lowerMsg.includes("authentication failed") ||
    lowerMsg.includes("invalid credentials");

  if (isAuth) {
    if (h.includes("zoho")) {
      return "Zoho authentication failed: Please use an App-Specific Password (generated from Zoho Account Security if 2FA is active) and ensure the correct Region (.com, .in, .eu) is selected.";
    }
    if (h.includes("office365") || h.includes("outlook")) {
      return "Microsoft 365 / Outlook authentication failed: Ensure 'Authenticated SMTP' is enabled in Microsoft 365 Admin Center for this mailbox, or generate an App Password.";
    }
    if (h.includes("gmail") || h.includes("google")) {
      return "Google / Gmail authentication failed: You MUST use a 16-character App Password (not your primary password) with 2-Step Verification enabled.";
    }
    return "Authentication failed: Please verify your email username and password or generate an app-specific password.";
  }

  if (code === "ENOTFOUND") {
    return `SMTP server address "${host || "host"}" could not be resolved. Please verify the host.`;
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || code === "ESOCKETTIMEDOUT") {
    return "SMTP connection timed out or was refused. Check port (465 for SSL, 587 for TLS) and security settings.";
  }
  return msg;
}

function formatImapError(err: any, host: string = ""): string {
  const msg = err?.message || String(err);
  const code = err?.code || "";
  const h = (host || "").toLowerCase();
  const lowerMsg = msg.toLowerCase();

  const isAuth =
    code === "EAUTH" ||
    lowerMsg.includes("authenticationfailed") ||
    lowerMsg.includes("invalid credentials") ||
    lowerMsg.includes("login failed") ||
    lowerMsg.includes("bad credentials");

  if (isAuth) {
    if (h.includes("zoho")) {
      return "Zoho IMAP authentication failed: Verify your App-Specific Password and ensure IMAP Access is turned ON in Zoho Mail Settings > Mail Accounts > IMAP Access.";
    }
    if (h.includes("office365") || h.includes("outlook")) {
      return "Microsoft 365 / Outlook IMAP authentication failed: Verify IMAP is enabled in Microsoft 365 Admin Center and check your credentials.";
    }
    if (h.includes("gmail") || h.includes("google")) {
      return "Google / Gmail IMAP authentication failed: Verify your 16-character App Password and ensure IMAP is enabled in Gmail Settings.";
    }
    return "IMAP authentication failed: Verify your username and password or app-specific password.";
  }

  if (lowerMsg.includes("command failed") || lowerMsg.includes("no [authenticationfailed]")) {
    if (h.includes("zoho")) {
      return "Zoho rejected IMAP access. Please check Zoho Mail Settings > Mail Accounts and confirm the 'IMAP Access' checkbox is checked, and use an App-Specific Password.";
    }
    if (h.includes("office365") || h.includes("outlook")) {
      return "Outlook rejected IMAP login. Confirm IMAP is enabled in your mailbox settings.";
    }
    if (h.includes("gmail") || h.includes("google")) {
      return "Gmail rejected IMAP login. Verify 2-Step Verification and 16-character App Password.";
    }
    return "IMAP server rejected the login command. Please check if IMAP access is enabled for this mailbox.";
  }

  if (code === "ENOTFOUND") {
    return `IMAP server address "${host || "host"}" could not be resolved. Please verify the host.`;
  }
  if (code === "ETIMEDOUT" || code === "ECONNREFUSED") {
    return "IMAP connection timed out. Verify port (usually 993 for SSL) and firewall settings.";
  }
  return msg;
}

/**
 * Live test of SMTP connection and authentication handshake.
 * Strict 7s timeout to prevent hanging on slow servers.
 */
export async function testSmtpConnection(
  config: SmtpConfig
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!config.host) {
    return { ok: false, error: "SMTP host is required." };
  }

  const secure = config.security === "ssl" || Number(config.port) === 465;

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
    const friendlyError = formatSmtpError(err, config.host);
    logger.warn({ host: config.host, port: config.port, err: friendlyError }, "SMTP verify failed");
    return { ok: false, error: friendlyError };
  }
}

/**
 * Live test of IMAP connection and INBOX handshake.
 * Strict 7s timeout.
 */
export async function testImapConnection(
  config: ImapConfig
): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!config.host) {
    return { ok: false, error: "IMAP host is required." };
  }

  if (!config.username || !config.password) {
    return { ok: false, error: "IMAP username and password are required." };
  }

  const secure = config.security === "ssl" || Number(config.port) === 993;

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
    const friendlyError = formatImapError(err, config.host);
    logger.warn({ host: config.host, port: config.port, err: friendlyError }, "IMAP verify failed");
    return { ok: false, error: friendlyError };
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

  const domain = input.from_email.split("@")[1] || "";
  let dnsHealth = { spf: "unknown", dkim: "unknown", dmarc: "unknown" };

  if (domain && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    try {
      const check = await Promise.race([
        checkDomainDnsHealth(domain),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
      ]);
      if (check) {
        dnsHealth = {
          spf: check.spf.status,
          dkim: "unknown",
          dmarc: check.dmarc.status,
        };
      }
    } catch {}
  }

  const created = await db.email_accounts.create({
    data: {
      user_id: userId,
      label: input.label.trim(),
      from_name: input.from_name?.trim() || null,
      from_email: input.from_email.toLowerCase().trim(),
      reply_to: input.reply_to?.toLowerCase().trim() || null,
      reply_inbox_account_id: input.reply_inbox_account_id?.trim() || null,
      signature: input.signature?.trim() || null,
      smtp_host: input.smtp_host ? input.smtp_host.trim() : null,
      smtp_port: input.smtp_port ? Number(input.smtp_port) : null,
      smtp_security: input.smtp_security || "tls",
      smtp_username: input.smtp_username ? input.smtp_username.trim() : null,
      smtp_password_enc: smtpPassEnc,
      imap_host: input.imap_host ? input.imap_host.trim() : null,
      imap_port: input.imap_port ? Number(input.imap_port) : null,
      imap_security: input.imap_security || "ssl",
      imap_username: imapUser?.trim() || null,
      imap_password_enc: imapPassEnc,
      hourly_limit: hourlyCap,
      daily_limit: dailyCap,
      gap_seconds: Math.max(Number(input.min_gap_seconds) || Number(input.gap_seconds) || 180, 30),
      min_gap_seconds: Math.max(Number(input.min_gap_seconds) || Number(input.gap_seconds) || 180, 30),
      max_gap_seconds: Math.max(Number(input.max_gap_seconds) || 420, Math.max(Number(input.min_gap_seconds) || 180, 30)),
      timezone: input.timezone || "UTC",
      warmup_enabled: Boolean(input.warmup_enabled),
      warmup_day: Math.max(Number(input.warmup_day) || 1, 1),
      warmup_start_limit: Math.max(Number(input.warmup_start_limit) || 10, 1),
      warmup_daily_increment: Math.max(Number(input.warmup_daily_increment) || 5, 1),
      warmup_max_limit: Math.min(Number(input.warmup_max_limit) || 50, 500),
      dns_spf_status: dnsHealth.spf,
      dns_dmarc_status: dnsHealth.dmarc,
      dns_checked_at: new Date(),
      status: "active",
    },
  });

  return sanitizeAccount(created);
}

/**
 * Update settings for an existing sender email account.
 */
export async function updateEmailAccount(
  userId: string,
  accountId: string,
  updates: Partial<CreateEmailAccountInput> & { status?: string }
) {
  const existing = await db.email_accounts.findFirst({
    where: { id: accountId, user_id: userId },
  });

  if (!existing) {
    throw new Error("Email account not found");
  }

  const dataPayload: any = {};
  if (updates.label !== undefined) dataPayload.label = updates.label.trim();
  if (updates.from_name !== undefined) dataPayload.from_name = updates.from_name.trim();
  if (updates.reply_to !== undefined) dataPayload.reply_to = updates.reply_to ? updates.reply_to.toLowerCase().trim() : null;
  if (updates.reply_inbox_account_id !== undefined) {
    dataPayload.reply_inbox_account_id = updates.reply_inbox_account_id ? updates.reply_inbox_account_id.trim() : null;
  }
  if (updates.signature !== undefined) dataPayload.signature = updates.signature;
  if (updates.hourly_limit !== undefined) {
    dataPayload.hourly_limit = Math.min(Math.max(Number(updates.hourly_limit), 1), 25);
  }
  if (updates.daily_limit !== undefined) {
    dataPayload.daily_limit = Math.min(Math.max(Number(updates.daily_limit), 1), 500);
  }
  if (updates.gap_seconds !== undefined) {
    dataPayload.gap_seconds = Math.max(Number(updates.gap_seconds) || 120, 30);
  }
  if (updates.min_gap_seconds !== undefined) {
    dataPayload.min_gap_seconds = Math.max(Number(updates.min_gap_seconds) || 180, 30);
    if (!updates.gap_seconds) {
      dataPayload.gap_seconds = dataPayload.min_gap_seconds;
    }
  }
  if (updates.max_gap_seconds !== undefined) {
    dataPayload.max_gap_seconds = Math.max(
      Number(updates.max_gap_seconds) || 420,
      dataPayload.min_gap_seconds || 30
    );
  }
  if (updates.timezone !== undefined) dataPayload.timezone = updates.timezone;
  if (updates.warmup_enabled !== undefined) dataPayload.warmup_enabled = Boolean(updates.warmup_enabled);
  if (updates.warmup_day !== undefined) dataPayload.warmup_day = Math.max(Number(updates.warmup_day) || 1, 1);
  if (updates.warmup_start_limit !== undefined) dataPayload.warmup_start_limit = Number(updates.warmup_start_limit);
  if (updates.warmup_daily_increment !== undefined) dataPayload.warmup_daily_increment = Number(updates.warmup_daily_increment);
  if (updates.warmup_max_limit !== undefined) dataPayload.warmup_max_limit = Number(updates.warmup_max_limit);
  if (updates.status !== undefined) dataPayload.status = updates.status;

  if (updates.smtp_password) {
    dataPayload.smtp_password_enc = encrypt(updates.smtp_password);
  }
  if (updates.imap_password) {
    dataPayload.imap_password_enc = encrypt(updates.imap_password);
  }

  const updated = await db.email_accounts.update({
    where: { id: accountId },
    data: dataPayload,
  });

  return sanitizeAccount(updated);
}

/**
 * List all email accounts for a user with live usage and warmup stats.
 */
export async function listEmailAccounts(userId: string) {
  const accounts = await db.email_accounts.findMany({
    where: { user_id: userId },
    orderBy: { created_at: "desc" },
  });

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const accountMap = new Map<string, any>(accounts.map((a: any) => [a.id, a]));

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

      const effectiveDailyLimit = getEffectiveAccountDailyLimit(acc);
      const remainingToday = Math.max(0, effectiveDailyLimit - sentToday);
      const linkedInbox = acc.reply_inbox_account_id ? accountMap.get(acc.reply_inbox_account_id) : null;

      return {
        ...sanitizeAccount(acc),
        reply_inbox: linkedInbox
          ? { id: linkedInbox.id, label: linkedInbox.label, from_email: linkedInbox.from_email }
          : null,
        effective_daily_limit: effectiveDailyLimit,
        remainingToday,
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
    oauth_access_token: account.oauth_access_token_enc ? decrypt(account.oauth_access_token_enc) : "",
    oauth_refresh_token: account.oauth_refresh_token_enc ? decrypt(account.oauth_refresh_token_enc) : "",
  };
}

function sanitizeAccount(acc: any) {
  const {
    smtp_password_enc,
    imap_password_enc,
    oauth_access_token_enc,
    oauth_refresh_token_enc,
    ...rest
  } = acc;
  return {
    ...rest,
    has_smtp_password: Boolean(smtp_password_enc),
    has_imap_password: Boolean(imap_password_enc),
    has_oauth_token: Boolean(oauth_access_token_enc || oauth_refresh_token_enc),
  };
}
