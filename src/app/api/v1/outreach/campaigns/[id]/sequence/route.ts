import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getCampaignSequence, saveCampaignSequence } from "@/server/email/sequence-service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await db.outreach_campaigns.findFirst({
    where: { id, user_id: session.user.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const seq = await getCampaignSequence(id);
  return NextResponse.json({ data: seq });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const campaign = await db.outreach_campaigns.findFirst({
    where: { id, user_id: session.user.id },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const saved = await saveCampaignSequence(
      session.user.id,
      id,
      body.name,
      body.steps || []
    );
    return NextResponse.json({ data: saved });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to save sequence";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
