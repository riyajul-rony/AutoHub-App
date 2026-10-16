import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { assertLimit } from "@/server/billing/limits";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const provider = searchParams.get("provider");

  let campaigns = await db.social_campaigns.findMany({
    where: scoped(session.user.id),
    include: { social_account: true },
  });

  if (provider) {
    campaigns = campaigns.filter((c: any) => c.social_account?.provider === provider);
  }

  return NextResponse.json({ data: campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const {
    name,
    social_account_id,
    openai_key_id,
    business_name,
    business_category,
    business_description,
    brand_voice,
    prompt,
    image_style,
    caption_length = "medium",
    post_times = ["10:00"],
    days_of_week = [1, 2, 3, 4, 5],
    timezone = "Asia/Dhaka",
    approval_mode = "auto",
  } = body;

  if (!name || !social_account_id) {
    return NextResponse.json({ error: "Campaign Name and Connected Social Account are required." }, { status: 400 });
  }

  // Enforce plan quota for active campaigns
  try {
    await assertLimit(session.user.id, "max_campaigns", 1);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  // Multi-tenant check: ensure social account belongs to current user
  const account = await db.social_accounts.findFirst({
    where: scoped(session.user.id, { id: social_account_id }),
  });
  if (!account) {
    return NextResponse.json({ error: "Social account not found or does not belong to you." }, { status: 400 });
  }

  // Multi-tenant check: ensure OpenAI key belongs to current user if specified
  if (openai_key_id) {
    const key = await db.api_keys.findFirst({
      where: scoped(session.user.id, { id: openai_key_id }),
    });
    if (!key) {
      return NextResponse.json({ error: "OpenAI API key not found or does not belong to you." }, { status: 400 });
    }
  }

  const newCampaign = await db.social_campaigns.create({
    data: {
      user_id: session.user.id,
      social_account_id,
      openai_key_id: openai_key_id || null,
      name,
      status: "active",
      business_name,
      business_category,
      business_description,
      brand_voice,
      prompt,
      image_style,
      caption_length: caption_length as any,
      post_times: Array.isArray(post_times) ? post_times : [post_times],
      days_of_week: Array.isArray(days_of_week) ? days_of_week : [1, 2, 3, 4, 5],
      timezone,
      approval_mode: approval_mode as any,
    },
  });

  return NextResponse.json({ data: newCampaign });
}
