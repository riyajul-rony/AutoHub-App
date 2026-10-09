import nodemailer from "nodemailer";
import { getConfig } from "@/server/config";
import { logger } from "@/server/logger";

export type SystemMail = { to: string; subject: string; text: string; html?: string };

/** Sends verification / notification mail through the system SMTP. Never logs the body. */
export async function sendSystemMail(mail: SystemMail): Promise<{ ok: boolean; error?: string }> {
  const [host, port, user, pass, from] = await Promise.all([
    getConfig("SYSTEM_SMTP_HOST"), getConfig("SYSTEM_SMTP_PORT"), getConfig("SYSTEM_SMTP_USER"),
    getConfig("SYSTEM_SMTP_PASS"), getConfig("SYSTEM_SMTP_FROM"),
  ]);
  if (!host || !from) {
    logger.warn({ to: mail.to, subject: mail.subject }, "System SMTP not configured; email not sent");
    return { ok: false, error: "System SMTP is not configured." };
  }
  const p = Number(port ?? 587);
  try {
    const transport = nodemailer.createTransport({
      host, port: p, secure: p === 465,
      auth: user ? { user, pass } : undefined,
    });
    await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return { ok: true };
  } catch (e) {
    logger.error({ err: e, to: mail.to }, "System email failed");
    return { ok: false, error: "Could not send email." };
  }
}
