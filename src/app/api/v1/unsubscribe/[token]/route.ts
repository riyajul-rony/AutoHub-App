import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

async function processUnsubscribe(token: string) {
  const recipient = await db.campaign_recipients.findFirst({
    where: { unsubscribe_token: token },
  });

  if (!recipient) {
    return { error: "Invalid token", status: 404 };
  }

  // 1. Mark recipient as unsubscribed
  await db.campaign_recipients.update({
    where: { id: recipient.id },
    data: { status: "unsubscribed" },
  });

  // 2. Add to suppressions
  const existing = await db.suppressions.findFirst({
    where: {
      user_id: recipient.user_id,
      email: recipient.email.toLowerCase(),
    },
  });

  if (!existing) {
    await db.suppressions.create({
      data: {
        user_id: recipient.user_id,
        email: recipient.email.toLowerCase(),
        reason: "unsubscribed",
        source_campaign_id: recipient.campaign_id,
      },
    });
  }

  return {
    success: true,
    unsubscribed: true,
    email: recipient.email,
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await processUnsubscribe(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number });
  }
  return NextResponse.json(result);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await processUnsubscribe(token);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status as number });
  }
  return NextResponse.json(result);
}
