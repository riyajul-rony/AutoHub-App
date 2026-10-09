import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length < 16) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // 1. Look up generated asset by unguessable token
  const asset = await db.assets.findUnique({
    where: { public_token: token },
  });

  if (!asset || asset.deleted_at) {
    return new NextResponse("Asset Not Found", { status: 404 });
  }

  // 2. Read file safely from disk storage
  try {
    const filePath = path.resolve(asset.path);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": asset.mime || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("File Read Error", { status: 500 });
  }
}
