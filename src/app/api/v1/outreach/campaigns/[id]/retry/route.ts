import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { queueEmailDispatch } from "@/server/queues";

export async function POST(
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

  // Find recipients with status: 'failed'
  const failedRecipients = await db.campaign_recipients.findMany({
    where: {
      campaign_id: id,
      user_id: session.user.id,
      status: "failed",
    },
    select: { id: true },
  });

  if (failedRecipients.length === 0) {
    return NextResponse.json({
      success: true,
      retriedCount: 0,
      message: "No failed recipients found to retry",
    });
  }

  // Update failed recipients back to 'queued' and clear error
  await db.campaign_recipients.updateMany({
    where: {
      campaign_id: id,
      user_id: session.user.id,
      status: "failed",
    },
    data: {
      status: "queued",
      error: null,
    },
  });

  // If campaign is running, enqueue email dispatch immediately
  if (campaign.status === "running") {
    queueEmailDispatch(campaign.id).catch(() => null);
  }

  return NextResponse.json({
    success: true,
    retriedCount: failedRecipients.length,
    message: `Successfully re-queued ${failedRecipients.length} failed recipient(s).`,
  });
}
