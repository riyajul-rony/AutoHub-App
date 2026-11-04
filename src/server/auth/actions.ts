"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { rateLimit } from "@/server/security/rate-limit";
import { getAppUrl, getConfig, getRegistrationMode } from "@/server/config";
import { sendSystemMail } from "@/server/email/system-mailer";
import { getSiteBranding } from "@/server/branding";
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
  const [appUrl, branding] = await Promise.all([
    getAppUrl(),
    getSiteBranding(),
  ]);
  const url = `${appUrl}/api/v1/auth/verify?token=${token}`;
  const logoHtml = branding.logo_url
    ? `<img src="${branding.logo_url}" alt="${branding.site_name}" style="height:36px;margin-bottom:20px;border-radius:6px;" />`
    : `<h2 style="color:#6366f1;margin-bottom:20px;">${branding.site_name}</h2>`;

  return sendSystemMail({
    to: email,
    subject: `Verify your ${branding.site_name} email`,
    text: `Welcome to ${branding.site_name}!\n\nConfirm your email address:\n${url}\n\nThis link expires in 24 hours.`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#1e293b;line-height:1.6;">
        ${logoHtml}
        <h3 style="font-size:20px;font-weight:700;margin-bottom:12px;color:#0f172a;">Welcome to ${branding.site_name}!</h3>
        <p style="margin-bottom:24px;font-size:14px;color:#475569;">
          Please confirm your email address by clicking the button below to get started with your automation workspace:
        </p>
        <div style="margin:28px 0;">
          <a href="${url}" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
          This link will expire in 24 hours. If you did not create an account, you can safely ignore this email.<br/>
          ${branding.footer_copyright}
        </p>
      </div>
    `,
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

  const regMode = await getRegistrationMode();
  if (!isAdmin && regMode === "closed") {
    return { error: "Registration is currently closed by the administrator." };
  }

  if (!isAdmin && regMode === "invite") {
    const inv = invite
      ? await db.verification_tokens.findUnique({ where: { token_hash: sha256(invite) } })
      : null;
    const valid = inv && inv.purpose === "invite" && !inv.used_at && inv.expires_at > new Date();
    if (!valid) return { error: "Registration is invite-only. Ask the admin for an invite code." };
    await db.verification_tokens.update({ where: { id: inv.id }, data: { used_at: new Date() } });
  }

  const existing = await db.users.findUnique({ where: { email } });
  if (!existing) {
    const defaultPlan = (await getConfig("DEFAULT_PLAN")) || "free";
    const user = await db.users.create({
      data: {
        email,
        name,
        password_hash: await hashPassword(password),
        role: isAdmin ? "super_admin" : "user",
        plan: defaultPlan,
        workspaces: { create: { name: "Default", is_default: true } },
        user_settings: { create: {} },
      },
    });
    const mail = await sendVerificationEmail(email);
    if (!mail.ok) {
      await db.activity_logs.create({
        data: {
          user_id: user.id,
          type: "email.verify_failed",
          message: `Verification email delivery failed: ${mail.error || "System SMTP"}`,
        },
      });
      await createSession(user.id);
      redirect(`/verify-email?delivery_error=${encodeURIComponent(mail.error || "Could not deliver email")}&email=${encodeURIComponent(email)}`);
    }

    await createSession(user.id);
    redirect(`/verify-email?sent=1&email=${encodeURIComponent(email)}`);
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

  const rawNext = form.get("next");
  const safeNext =
    typeof rawNext === "string" &&
    rawNext.startsWith("/") &&
    !rawNext.startsWith("//") &&
    !rawNext.startsWith("/\\")
      ? rawNext
      : "";

  if (!user.email_verified_at) {
    redirect(
      `/login?error=unverified&email=${encodeURIComponent(user.email)}${
        safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""
      }`
    );
  }

  await createSession(user.id);
  await db.users.update({ where: { id: user.id }, data: { last_login_at: new Date() } });

  if (safeNext) {
    redirect(safeNext);
  } else if (!user.onboarded_at) {
    redirect("/onboarding");
  } else {
    redirect("/app");
  }
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

export async function resendVerificationAction(_?: FormState, form?: FormData): Promise<FormState> {
  const s = await getSessionUser();
  let targetEmail = s?.user?.email;

  if (!targetEmail && form) {
    const raw = form.get("email");
    if (typeof raw === "string" && raw.includes("@")) {
      targetEmail = raw.trim().toLowerCase();
    }
  }

  if (!targetEmail) return { error: "Please provide your email address to receive a verification link." };
  if (s?.user?.email_verified_at) return { message: "Your email is already verified." };

  // 60-second cooldown between resends
  const cooldown = await rateLimit(`resend_cd:${targetEmail}`, 1, 60_000);
  if (!cooldown.ok) {
    return { error: "Please wait 60 seconds before requesting another verification email." };
  }

  const rl = await rateLimit(`resend:${targetEmail}`, 5, HOUR);
  if (!rl.ok) return { error: "Please wait 15 minutes before requesting another verification email." };

  const r = await sendVerificationEmail(targetEmail);
  return r.ok
    ? { message: "A new verification link has been sent to your email." }
    : { error: `Verification email delivery failed: ${r.error || "System SMTP error"}` };
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
    const [appUrl, branding] = await Promise.all([
      getAppUrl(),
      getSiteBranding(),
    ]);
    const url = `${appUrl}/reset-password?token=${token}`;
    const logoHtml = branding.logo_url
      ? `<img src="${branding.logo_url}" alt="${branding.site_name}" style="height:36px;margin-bottom:20px;border-radius:6px;" />`
      : `<h2 style="color:#6366f1;margin-bottom:20px;">${branding.site_name}</h2>`;

    await sendSystemMail({
      to: user.email,
      subject: `Reset your ${branding.site_name} password`,
      text: `Reset your password:\n${url}\n\nThe link works once and expires in 1 hour. If you didn't ask for this, ignore this email.`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:540px;margin:0 auto;padding:32px 24px;color:#1e293b;line-height:1.6;">
          ${logoHtml}
          <h3 style="font-size:20px;font-weight:700;margin-bottom:12px;color:#0f172a;">Password Reset Request</h3>
          <p style="margin-bottom:24px;font-size:14px;color:#475569;">
            We received a request to reset the password for your ${branding.site_name} account. Click below to choose a new password:
          </p>
          <div style="margin:28px 0;">
            <a href="${url}" style="background-color:#4f46e5;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;display:inline-block;">
              Reset Password
            </a>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin-top:32px;border-top:1px solid #e2e8f0;padding-top:16px;">
            This link is valid for 1 hour. If you did not make this request, you can safely ignore this email.<br/>
            ${branding.footer_copyright}
          </p>
        </div>
      `,
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
  await destroyAllSessions(user.id);
  redirect("/login?reset=1");
}
