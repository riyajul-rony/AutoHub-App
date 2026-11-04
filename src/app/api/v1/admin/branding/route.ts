import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { getSiteBranding, saveSiteBranding } from "@/server/branding";
import { recordAuditLog } from "@/server/audit";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  try {
    const branding = await getSiteBranding();
    return NextResponse.json({ data: branding });
  } catch (err: any) {
    logger.error({ err: err?.message }, "Failed to get branding");
    return NextResponse.json({ error: "Failed to load branding" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const updated = await saveSiteBranding(body);

    await recordAuditLog({
      adminId: session.user.id,
      action: "branding.update",
      targetType: "branding",
      targetId: "site_branding",
      afterState: updated,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Branding and site content updated successfully.",
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "Failed to update site branding");
    return NextResponse.json({ error: err?.message || "Failed to save branding" }, { status: 500 });
  }
}

