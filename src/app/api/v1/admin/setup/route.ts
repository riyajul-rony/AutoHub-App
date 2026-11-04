import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { encrypt } from "@/server/crypto";
import { db } from "@/server/db";
import {
  getConfig,
  getGlobalPlatformSettings,
  invalidateSettingCache,
} from "@/server/config";
import { hasPermission } from "@/server/auth/permissions";
import { recordAuditLog } from "@/server/audit";

function maskSecret(val?: string, prefixLen = 3): string {
  if (!val || val.trim().length === 0) return "";
  const trimmed = val.trim();
  if (trimmed.length <= 8) return "••••••••";
  const start = trimmed.slice(0, prefixLen);
  const end = trimmed.slice(-4);
  return `${start}••••••••${end}`;
}

export async function GET() {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@example.com",
        role: "super_admin",
      } as any,
    };
  }

  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  const [
    globalSettings,
    openaiKey,
    metaAppId,
    metaAppSecret,
    googleClientId,
    googleClientSecret,
    smtpHost,
    smtpPort,
    smtpUser,
    smtpPass,
    smtpFrom,
  ] = await Promise.all([
    getGlobalPlatformSettings(),
    getConfig("OPENAI_API_KEY"),
    getConfig("META_APP_ID"),
    getConfig("META_APP_SECRET"),
    getConfig("GOOGLE_CLIENT_ID"),
    getConfig("GOOGLE_CLIENT_SECRET"),
    getConfig("SYSTEM_SMTP_HOST"),
    getConfig("SYSTEM_SMTP_PORT"),
    getConfig("SYSTEM_SMTP_USER"),
    getConfig("SYSTEM_SMTP_PASS"),
    getConfig("SYSTEM_SMTP_FROM"),
  ]);

  return NextResponse.json({
    data: {
      global: globalSettings,
      credentials: {
        openaiConfigured: Boolean(openaiKey),
        openaiApiKeyMasked: maskSecret(openaiKey, 3),

        metaConfigured: Boolean(metaAppId && metaAppSecret),
        metaAppId: metaAppId || "",
        metaAppSecretMasked: maskSecret(metaAppSecret, 0),

        googleConfigured: Boolean(googleClientId && googleClientSecret),
        googleClientId: googleClientId || "",
        googleClientSecretMasked: maskSecret(googleClientSecret, 0),

        smtpConfigured: Boolean(smtpHost && smtpFrom),
        smtpHost: smtpHost || "",
        smtpPort: smtpPort || "587",
        smtpUser: smtpUser || "",
        smtpPassMasked: maskSecret(smtpPass, 0),
        smtpFrom: smtpFrom || "",
      },
    },
  });
}

export async function POST(req: NextRequest) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: {
        id: "00000000-0000-0000-0000-000000000001",
        email: "admin@example.com",
        role: "super_admin",
      } as any,
    };
  }

  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      // Global Settings
      registrationMode,
      maintenanceMode,
      maintenanceMessage,
      siteName,
      supportEmail,
      defaultPlan,
      trialDays,

      // Credentials
      metaAppId,
      metaAppSecret,
      googleClientId,
      googleClientSecret,
      openaiApiKey,
    } = body;

    const changes: Record<string, any> = {};

    // 1. Registration mode ("open" | "invite" | "closed")
    if (registrationMode && ["open", "invite", "closed"].includes(registrationMode)) {
      await db.system_settings.upsert({
        where: { key: "REGISTRATION_MODE" },
        create: { key: "REGISTRATION_MODE", value_enc: encrypt(registrationMode) },
        update: { value_enc: encrypt(registrationMode) },
      });
      changes.registrationMode = registrationMode;
    }

    // 2. Maintenance mode & message
    if (maintenanceMode !== undefined) {
      const maintVal = Boolean(maintenanceMode).toString();
      await db.system_settings.upsert({
        where: { key: "MAINTENANCE_MODE" },
        create: { key: "MAINTENANCE_MODE", value_enc: encrypt(maintVal) },
        update: { value_enc: encrypt(maintVal) },
      });
      changes.maintenanceMode = maintVal;
    }

    if (maintenanceMessage !== undefined && typeof maintenanceMessage === "string") {
      await db.system_settings.upsert({
        where: { key: "MAINTENANCE_MESSAGE" },
        create: { key: "MAINTENANCE_MESSAGE", value_enc: encrypt(maintenanceMessage.trim()) },
        update: { value_enc: encrypt(maintenanceMessage.trim()) },
      });
      changes.maintenanceMessage = maintenanceMessage.trim();
    }

    // 3. Site Name & Support Email
    if (siteName && typeof siteName === "string" && siteName.trim()) {
      await db.system_settings.upsert({
        where: { key: "SITE_NAME" },
        create: { key: "SITE_NAME", value_enc: encrypt(siteName.trim()) },
        update: { value_enc: encrypt(siteName.trim()) },
      });
      changes.siteName = siteName.trim();
    }

    if (supportEmail && typeof supportEmail === "string" && supportEmail.trim()) {
      await db.system_settings.upsert({
        where: { key: "SUPPORT_EMAIL" },
        create: { key: "SUPPORT_EMAIL", value_enc: encrypt(supportEmail.trim()) },
        update: { value_enc: encrypt(supportEmail.trim()) },
      });
      changes.supportEmail = supportEmail.trim();
    }

    // 4. Default Plan & Trial Days
    if (defaultPlan && typeof defaultPlan === "string" && defaultPlan.trim()) {
      await db.system_settings.upsert({
        where: { key: "DEFAULT_PLAN" },
        create: { key: "DEFAULT_PLAN", value_enc: encrypt(defaultPlan.trim()) },
        update: { value_enc: encrypt(defaultPlan.trim()) },
      });
      changes.defaultPlan = defaultPlan.trim();
    }

    if (trialDays !== undefined) {
      const daysStr = String(Math.max(0, parseInt(String(trialDays), 10) || 0));
      await db.system_settings.upsert({
        where: { key: "TRIAL_DAYS" },
        create: { key: "TRIAL_DAYS", value_enc: encrypt(daysStr) },
        update: { value_enc: encrypt(daysStr) },
      });
      changes.trialDays = daysStr;
    }

    // 5. Credentials (Only update if non-empty and not masked)
    if (metaAppId !== undefined && typeof metaAppId === "string") {
      const trimmed = metaAppId.trim();
      if (trimmed) {
        await db.system_settings.upsert({
          where: { key: "META_APP_ID" },
          create: { key: "META_APP_ID", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.metaAppId = trimmed;
      }
    }

    if (metaAppSecret && typeof metaAppSecret === "string") {
      const trimmed = metaAppSecret.trim();
      // If user typed a new secret (not placeholder dots)
      if (trimmed && !trimmed.startsWith("••••")) {
        await db.system_settings.upsert({
          where: { key: "META_APP_SECRET" },
          create: { key: "META_APP_SECRET", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.metaAppSecretUpdated = true;
      }
    }

    if (googleClientId !== undefined && typeof googleClientId === "string") {
      const trimmed = googleClientId.trim();
      if (trimmed) {
        await db.system_settings.upsert({
          where: { key: "GOOGLE_CLIENT_ID" },
          create: { key: "GOOGLE_CLIENT_ID", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.googleClientId = trimmed;
      }
    }

    if (googleClientSecret && typeof googleClientSecret === "string") {
      const trimmed = googleClientSecret.trim();
      if (trimmed && !trimmed.startsWith("••••")) {
        await db.system_settings.upsert({
          where: { key: "GOOGLE_CLIENT_SECRET" },
          create: { key: "GOOGLE_CLIENT_SECRET", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.googleClientSecretUpdated = true;
      }
    }

    if (openaiApiKey && typeof openaiApiKey === "string") {
      const trimmed = openaiApiKey.trim();
      if (trimmed && !trimmed.startsWith("sk-•••") && !trimmed.startsWith("••••")) {
        await db.system_settings.upsert({
          where: { key: "OPENAI_API_KEY" },
          create: { key: "OPENAI_API_KEY", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.openaiApiKeyUpdated = true;
      }
    }

    // SMTP Configuration
    const { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body || {};
    if (smtpHost !== undefined && typeof smtpHost === "string") {
      const trimmed = smtpHost.trim();
      if (trimmed) {
        await db.system_settings.upsert({
          where: { key: "SYSTEM_SMTP_HOST" },
          create: { key: "SYSTEM_SMTP_HOST", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.smtpHost = trimmed;
      }
    }

    if (smtpPort !== undefined) {
      const portStr = String(smtpPort).trim();
      if (portStr) {
        await db.system_settings.upsert({
          where: { key: "SYSTEM_SMTP_PORT" },
          create: { key: "SYSTEM_SMTP_PORT", value_enc: encrypt(portStr) },
          update: { value_enc: encrypt(portStr) },
        });
        changes.smtpPort = portStr;
      }
    }

    if (smtpUser !== undefined && typeof smtpUser === "string") {
      const trimmed = smtpUser.trim();
      if (trimmed) {
        await db.system_settings.upsert({
          where: { key: "SYSTEM_SMTP_USER" },
          create: { key: "SYSTEM_SMTP_USER", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.smtpUser = trimmed;
      }
    }

    if (smtpPass && typeof smtpPass === "string") {
      const trimmed = smtpPass.trim();
      if (trimmed && !trimmed.startsWith("••••")) {
        await db.system_settings.upsert({
          where: { key: "SYSTEM_SMTP_PASS" },
          create: { key: "SYSTEM_SMTP_PASS", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.smtpPassUpdated = true;
      }
    }

    if (smtpFrom !== undefined && typeof smtpFrom === "string") {
      const trimmed = smtpFrom.trim();
      if (trimmed) {
        await db.system_settings.upsert({
          where: { key: "SYSTEM_SMTP_FROM" },
          create: { key: "SYSTEM_SMTP_FROM", value_enc: encrypt(trimmed) },
          update: { value_enc: encrypt(trimmed) },
        });
        changes.smtpFrom = trimmed;
      }
    }

    // 6. Invalidate Redis and in-memory caches immediately
    await invalidateSettingCache();

    // 7. Audit Log
    await recordAuditLog({
      adminId: session.user.id,
      action: "settings.update",
      targetType: "system_settings",
      afterState: changes,
    });

    return NextResponse.json({
      success: true,
      message: "Platform settings updated and cached successfully.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save settings";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
