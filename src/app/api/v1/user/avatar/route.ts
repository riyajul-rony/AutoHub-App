import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, refreshSessionCache } from "@/server/auth/session";
import { db } from "@/server/db";
import { saveAvatar, removeAvatar, MAX_AVATAR_BYTES } from "@/server/storage/avatar";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string" || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "No image file provided." },
        { status: 400 }
      );
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json(
        { error: "Image size must be 2MB or less." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResult = await saveAvatar(buffer, file.type, session.user.id);

    if (uploadResult.error || !uploadResult.url) {
      return NextResponse.json(
        { error: uploadResult.error || "Failed to save avatar image." },
        { status: 400 }
      );
    }

    // Lookup previous avatar to clean up old file from disk
    const existing = await db.users.findUnique({
      where: { id: session.user.id },
      select: { avatar_url: true },
    });

    if (existing?.avatar_url && existing.avatar_url !== uploadResult.url) {
      await removeAvatar(existing.avatar_url);
    }

    // Persist new avatar URL to user record
    await db.users.update({
      where: { id: session.user.id },
      data: { avatar_url: uploadResult.url },
    });

    // Invalidate Redis session cache so Topbar and UI update immediately
    await refreshSessionCache(session.user.id);

    return NextResponse.json({
      success: true,
      avatar_url: uploadResult.url,
      message: "Avatar updated successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process avatar upload." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await getSessionUser();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await db.users.findUnique({
      where: { id: session.user.id },
      select: { avatar_url: true },
    });

    if (existing?.avatar_url) {
      await removeAvatar(existing.avatar_url);
    }

    await db.users.update({
      where: { id: session.user.id },
      data: { avatar_url: null },
    });

    await refreshSessionCache(session.user.id);

    return NextResponse.json({
      success: true,
      avatar_url: null,
      message: "Avatar removed successfully.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to remove avatar." },
      { status: 500 }
    );
  }
}

