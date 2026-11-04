import { NextRequest, NextResponse } from "next/server";
import { getAvatarFile } from "@/server/storage/avatar";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  if (!filename) {
    return new NextResponse("Filename required", { status: 400 });
  }

  const result = await getAvatarFile(filename);
  if (!result) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return new Response(result.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
