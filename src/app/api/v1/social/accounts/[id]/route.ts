import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.social_accounts.findFirst({
    where: scoped(session.user.id, { id }),
  });
  if (!existing) {
    return NextResponse.json({ error: "Account not found or not owned by you" }, { status: 404 });
  }

  try {
    await db.social_accounts.delete({
      where: scoped(session.user.id, { id }),
    });
    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to disconnect account" }, { status: 500 });
  }
}
