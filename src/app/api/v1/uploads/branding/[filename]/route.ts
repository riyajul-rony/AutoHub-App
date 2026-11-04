import { NextRequest, NextResponse } from "next/server";
import { getBrandingFile } from "@/server/storage/branding";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename) {
    return new NextResponse("Filename required", { status: 400 });
  }

  const result = await getBrandingFile(filename);
  if (!result) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new Response(result.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      // Immutable caching since versioning hash is in filename/query
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
