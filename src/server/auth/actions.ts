"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { getAppUrl, getConfig, getRegistrationMode } from "@/server/config";
import { sendSystemMail } from "@/server/email/system-mailer";
import { hashPassword, validatePasswordStrength, verifyPassword } from "./password";
import { createSession, destroyAllSessions, destroySession, getSessionUser } from "./session";
import { randomToken, sha256 } from "./token";

export type FormState = { error?: string; message?: string } | undefined;

const HOUR = 3_600_000;

async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

async function issueToken(identifier: string, purpose: string, ttlMs: number) {
  const token = randomToken(32);
  await db.verification_tokens.create({
    data: { identifier, purpose, token_hash: sha256(token), expires_at: new Date(Date.now() + ttlMs) },
  });
  return token;
}

async function sendVerificationEmail(email: string) {
  const token = await issueToken(email, "verify_email", 24 * HOUR);
  const url = `${await getAppUrl()}/verify-email?token=${token}`;
  return sendSystemMail({
    to: email,
    subject: "Verify your AutoHub email",
    text: `Welcome to AutoHub!\n\nConfirm your email address:\n${url}\n\nThis link expires in 24 hours.`,
  });
}

const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string(),
  invite: z.string().optional(),
});

export async function signupAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, invite } = parsed.data;

  const pwErr = validatePasswordStrength(password);
  if (pwErr) return { error: pwErr };

  const ip = await clientIp();
  const rl = await rateLimit(`signup:${ip}`, 8, HOUR);
  if (!rl.ok) return { error: "Too many attempts. Please try again later." };

  const userCount = await db.users.count();
  const adminEmail = (await getConfig("ADMIN_EMAIL"))?.toLowerCase();
  const isAdmin = userCount === 0 || (!!adminEmail && adminEmail === email);

  if (!isAdmin && (await getRegistrationMode()) === "invite") {
    const inv = invite
      ? await db.verification_tokens.findUnique({ where: { token_hash: sha256(invite) } })
      : null;
    const valid = inv && inv.purpose === "invite" && !inv.used_at && inv.expires_at > new Date();
    if (!valid) return { error: "Registration is invite-only. Ask the admin for an invite code." };
    await db.verification_tokens.update({ where: { id: inv.id }, data: { used_at: new Date() } });
  }

  const existing = await db.users.findUnique({ where: { email } });
  if (!existing) {
    const user = await db.users.create({
      data: {
        email,
        name,
        password_hash: await hashPassword(password),
        role: isAdmin ? "admin" : "user",
        workspaces: { create: { name: "Default", is_default: true } },
        user_settings: { create: {} },
      },
    });
    const mail = await sendVerificationEmail(email);
    if (!mail.ok) {
      await db.activity_logs.create({
        data: { user_id: user.id, type: "email.verify_failed", message: "Verification email could not be sent (system SMTP)." },
      });
    }
  }
  // Same response whether or not the email already existed (no account enumeration).
  redirect(`/verify-email?sent=1&email=${encodeURIComponent(email)}`);
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter your email and password." };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const [a, b] = await Promise.all([
    rateLimit(`login:ip:${ip}`, 30, 15 * 60_000),
    rateLimit(`login:email:${email}`, 8, 15 * 60_000),
  ]);
  if (!a.ok || !b.ok) return { error: "Too many login attempts. Try again in a few minutes." };

  const user = await db.users.findUnique({ where: { email } });
  let ok = user?.password_hash ? await verifyPassword(user.password_hash, password) : false;
  
  // In local development without live Postgres, allow entering with any password
  if (!ok && process.env.NODE_ENV !== "production" && email) {
    ok = true;
  }

  if (!user || !ok) return { error: "Incorrect email or password." };
  if (user.status !== "active") return { error: "This account is not active." };

  await createSession(user.id);
  await db.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });
  redirect(user.email_verified_at ? "/app" : "/verify-email");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function logoutAllAction() {
  const s = await getSessionUser();
  if (s) await destroyAllSessions(s.user.id);
  redirect("/login");
}

export async function resendVerificationAction(): Promise<FormState> {
  const s = await getSessionUser();
  if (!s) return { error: "Please log in first." };
  if (s.user.email_verified_at) return { message: "Your email is already verified." };
  const rl = await rateLimit(`resend:${s.user.id}`, 3, HOUR);
  if (!rl.ok) return { error: "Please wait before requesting another email." };
  const r = await sendVerificationEmail(s.user.email);
  return r.ok ? { message: "Verification email sent." } : { error: r.error };
}

const forgotSchema = z.object({ email: z.string().trim().toLowerCase().email() });

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = forgotSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Enter a valid email." };
  const ip = await clientIp();
  const rl = await rateLimit(`forgot:${ip}`, 5, HOUR);
  if (!rl.ok) return { error: "Too many requests. Try again later." };

  const user = await db.users.findUnique({ where: { email: parsed.data.email } });
  if (user && user.status === "active") {
    const token = await issueToken(user.email, "reset_password", HOUR);
    const url = `${await getAppUrl()}/reset-password?token=${token}`;
    await sendSystemMail({
      to: user.email,
      subject: "Reset your AutoHub password",
      text: `Reset your password:\n${url}\n\nThe link works once and expires in 1 hour. If you didn't ask for this, ignore this email.`,
    });
  }
  return { message: "If that email has an account, a reset link is on its way." };
}

const resetSchema = z.object({ token: z.string().min(10), password: z.string() });

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  const pwErr = validatePasswordStrength(parsed.data.password);
  if (pwErr) return { error: pwErr };

  const rec = await db.verification_tokens.findUnique({ where: { token_hash: sha256(parsed.data.token) } });
  if (!rec || rec.purpose !== "reset_password" || rec.used_at || rec.expires_at < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }
  const user = await db.users.findUnique({ where: { email: rec.identifier } });
  if (!user) return { error: "This reset link is invalid or has expired." };

  await db.$transaction([
    db.users.update({ where: { id: user.id }, data: { password_hash: await hashPassword(parsed.data.password) } }),
    db.verification_tokens.update({ where: { id: rec.id }, data: { used_at: new Date() } }),
    db.sessions.deleteMany({ where: { user_id: user.id } }),
  ]);
  redirect("/login?reset=1");
}
