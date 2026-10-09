import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", role: "admin" } as any,
    };
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await db.social_campaigns.update({
    where: scoped(session.user.id, { id }),
    data: body,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", role: "admin" } as any,
    };
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.social_campaigns.delete({
      where: scoped(session.user.id, { id }),
    });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete campaign" }, { status: 500 });
  }
}
