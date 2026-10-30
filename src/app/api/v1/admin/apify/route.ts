import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import {
  getApifySettings,
  saveApifySettings,
  saveApifyToken,
  getMaskedApifyToken,
  isApifyConfigured,
  getApifyConfigStatus,
} from "@/server/providers/leads/apify/config";
import { recordAuditLog } from "@/server/audit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const apifyAdminInputSchema = z.object({
  token: z.string().trim().optional(),
  settings: z
    .object({
      google_maps_provider: z.enum(["kaix"]).optional(),
      actors: z
        .object({
          google_maps: z.string().trim().min(1),
          meta_ads: z.string().trim().min(1),
          b2b_leads: z.string().trim().min(1),
        })
        .optional(),
      limits: z
        .object({
          maxLinesPerRun: z.number().int().min(1).max(20),
          maxLeadsPerRun: z.object({
            google_maps: z.number().int().min(1).max(1000),
            meta_ads: z.number().int().min(1).max(1000),
            b2b_leads: z.number().int().min(1).max(1000),
          }),
          maxSpendUsd: z.number().min(0.1).max(100),
          maxConcurrentPerUser: z.number().int().min(1).max(10),
          maxRunsPerHour: z.number().int().min(1).max(100),
          enablePaidContacts: z.boolean().optional(),
        })
        .optional(),
      unitPrices: z
        .object({
          google_maps: z.number().min(0).optional(),
          meta_ads: z.number().min(0).optional(),
          b2b_leads: z.number().min(0).optional(),
        })
        .optional(),
    })
    .optional(),
});

export async function GET() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json(
      { error: "Forbidden: settings.manage permission required" },
      { status: 403 }
    );
  }

  const [status, maskedToken, settings] = await Promise.all([
    getApifyConfigStatus(),
    getMaskedApifyToken(),
    getApifySettings(),
  ]);

  const hasEncryptionKey = Boolean(
    process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.trim().length > 0
  );

  return NextResponse.json({
    data: {
      configured: status.configured,
      reason: status.reason,
      lastTest: status.lastTest || null,
      maskedToken,
      settings,
      hasEncryptionKey,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json(
      { error: "Forbidden: settings.manage permission required" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON format" }, { status: 400 });
  }

  const parsed = apifyAdminInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Validation failed" },
      { status: 422 }
    );
  }

  const { token, settings } = parsed.data;

  try {
    let maskedToken = await getMaskedApifyToken();

    if (token !== undefined && token.trim().length > 0) {
      maskedToken = await saveApifyToken(token.trim());
      await recordAuditLog({
        adminId: session.user.id,
        action: "apify.token_update",
        targetType: "system_settings",
        targetId: "apify_token",
        afterState: { maskedToken },
      });
    }

    let updatedSettings = await getApifySettings();
    if (settings) {
      updatedSettings = await saveApifySettings(settings);
      await recordAuditLog({
        adminId: session.user.id,
        action: "apify.settings_update",
        targetType: "system_settings",
        targetId: "apify_config",
        afterState: updatedSettings,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        configured: true,
        maskedToken,
        settings: updatedSettings,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update Apify configuration" },
      { status: 400 }
    );
  }
}
