import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/permissions";
import { saveBrandingImage, BrandingImageType } from "@/server/storage/branding";
import { recordAuditLog } from "@/server/audit";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";

const VALID_TYPES: BrandingImageType[] = ["logo_light", "logo_dark", "favicon", "og_image"];

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session || !hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json(
      { error: "Forbidden: settings.manage permission required" },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const targetType = formData.get("type") as BrandingImageType;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No image file provided." }, { status: 400 });
    }

    if (!targetType || !VALID_TYPES.includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid branding asset type. Allowed: logo_light, logo_dark, favicon, og_image." },
        { status: 400 }
      );
    }

    const arrayBuffer = await (file as Blob).arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await saveBrandingImage(buffer, targetType);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await recordAuditLog({
      adminId: session.user.id,
      action: "branding.image_upload",
      targetType: "branding",
      targetId: targetType,
      afterState: { url: result.url, type: targetType },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      ok: true,
      url: result.url,
      message: "Branding asset uploaded successfully.",
    });
  } catch (err: any) {
    logger.error({ err: err?.message }, "Failed to process branding asset upload");
    return NextResponse.json(
      { error: "An unexpected error occurred during image upload. Please try again." },
      { status: 500 }
    );
  }
}
