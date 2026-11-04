import nodemailer from "nodemailer";
import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";

export type SystemMail = { to: string; subject: string; text: string; html?: string };

function sanitizeFromAddress(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"') && cleaned.length > 2) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

/** Sends verification / notification mail through the system SMTP. Never logs the body. */
export async function sendSystemMail(mail: SystemMail): Promise<{ ok: boolean; error?: string }> {
  const [host, port, user, pass, from] = await Promise.all([
    getConfig("SYSTEM_SMTP_HOST"),
    getConfig("SYSTEM_SMTP_PORT"),
    getConfig("SYSTEM_SMTP_USER"),
    getConfig("SYSTEM_SMTP_PASS"),
    getConfig("SYSTEM_SMTP_FROM"),
  ]);

  if (!host || !from) {
    logger.warn({ to: mail.to, subject: mail.subject }, "System SMTP not configured; email not sent");
    return { ok: false, error: "System SMTP is not configured (missing Host or From address)." };
  }

  const p = Number(port ?? 587);
  const cleanFrom = sanitizeFromAddress(from);

  try {
    const transport = nodemailer.createTransport({
      host,
      port: p,
      secure: p === 465,
      auth: user ? { user: user.trim(), pass: pass ? pass.trim() : "" } : undefined,
      requireTLS: p === 587,
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
    });

    await transport.sendMail({
      from: cleanFrom,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    logger.info({ to: mail.to, subject: mail.subject }, "System email sent successfully via SMTP");
    return { ok: true };
  } catch (e: any) {
    const errorDetail = e?.response || e?.message || String(e);
    const errorCode = e?.code ? ` [Code: ${e.code}]` : "";
    logger.error({ err: errorDetail, code: e?.code, response: e?.response, to: mail.to }, "System email failed");
    return { ok: false, error: `${errorDetail}${errorCode}` };
  }
}

/** Verifies SMTP credentials and connection directly */
export async function verifySystemSmtp(customConfig?: {
  host?: string;
  port?: number | string;
  user?: string;
  pass?: string;
}): Promise<{ ok: boolean; message: string; error?: string }> {
  const host = customConfig?.host || (await getConfig("SYSTEM_SMTP_HOST"));
  const port = customConfig?.port || (await getConfig("SYSTEM_SMTP_PORT")) || 587;
  const user = customConfig?.user || (await getConfig("SYSTEM_SMTP_USER"));
  const pass = customConfig?.pass || (await getConfig("SYSTEM_SMTP_PASS"));

  if (!host) {
    return { ok: false, message: "SMTP Host is not configured.", error: "MISSING_HOST" };
  }

  const p = Number(port);
  try {
    const transport = nodemailer.createTransport({
      host,
      port: p,
      secure: p === 465,
      auth: user ? { user: user.trim(), pass: pass ? pass.trim() : "" } : undefined,
      requireTLS: p === 587,
      tls: {
        rejectUnauthorized: true,
        minVersion: "TLSv1.2",
      },
    });

    await transport.verify();
    return { ok: true, message: `SMTP connection established successfully to ${host}:${p}!` };
  } catch (e: any) {
    const errorDetail = e?.response || e?.message || String(e);
    const errorCode = e?.code ? ` [Code: ${e.code}]` : "";
    return { ok: false, message: `SMTP connection failed: ${errorDetail}${errorCode}`, error: e?.code || "AUTH_FAILED" };
  }
}
