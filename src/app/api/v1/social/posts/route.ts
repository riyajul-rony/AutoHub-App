import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { generateSocialPost } from "@/server/ai/social-generator";
import { decrypt } from "@/server/crypto";
import { getUserApiKey } from "@/server/api-keys/service";
import { assertLimit } from "@/server/billing/limits";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const posts = await db.post_runs.findMany({
    where: scoped(session.user.id),
    include: {
      campaign: {
        include: { social_account: true },
      },
    },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: posts });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertLimit(session.user.id, "monthly_social_posts", 1);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const { campaign_id } = body;

  let campaign: any = null;
  if (campaign_id) {
    campaign = await db.social_campaigns.findFirst({
      where: scoped(session.user.id, { id: campaign_id }),
      include: { social_account: true },
    });
  }

  if (!campaign) {
    campaign = await db.social_campaigns.findFirst({
      where: scoped(session.user.id),
      include: { social_account: true },
    });
  }

  if (!campaign) {
    let account = await db.social_accounts.findFirst({
      where: scoped(session.user.id),
    });
    if (!account) {
      account = await db.social_accounts.create({
        data: {
          user_id: session.user.id,
          provider: "facebook",
          external_id: `page_${Date.now()}`,
          display_name: "Default Brand Page",
          status: "active",
        },
      });
    }
    campaign = await db.social_campaigns.create({
      data: {
        user_id: session.user.id,
        social_account_id: account.id,
        name: "General Brand Updates",
        status: "active",
        timezone: "Asia/Dhaka",
      },
      include: { social_account: true },
    });
  }

  // Get user's personal OpenAI API key
  let apiKey: string | undefined;
  if (campaign?.openai_key_id) {
    const keyRec = await db.api_keys.findFirst({
      where: scoped(session.user.id, { id: campaign.openai_key_id }),
    });
    if (keyRec) apiKey = decrypt(keyRec.key_enc);
  }
  if (!apiKey) {
    apiKey = (await getUserApiKey(session.user.id, "openai")) || process.env.OPENAI_API_KEY;
  }

  const businessCategory = campaign?.business_category || "Business Growth";
  const businessName = campaign?.business_name || "Lead Reach AI";
  const prompt = campaign?.prompt || "Daily motivation, client success tip, and engagement question";
  const brandVoice = campaign?.brand_voice || "Professional";

  let generatedCaption = `🚀 Level up your ${businessCategory} today!\n\nConsistency and authentic value are the keys to long-term success. Stay focused on your goals.\n\n👉 Share your thoughts in the comments!`;
  let generatedHashtags = ["#Automation", "#Growth", "#Success", "#LeadReachAI"];
  let imagePrompt = `Modern architectural concept, photorealistic 8k`;
  let imageUrl = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1080&q=80";

  if (apiKey) {
    try {
      const aiResult = await generateSocialPost({
        apiKey,
        businessName,
        businessCategory,
        businessDescription: campaign?.business_description || "",
        targetAudience: campaign?.target_audience || "Entrepreneurs",
        brandVoice,
        prompt,
        imageStyle: campaign?.image_style || "Photorealistic",
        captionLength: (campaign?.caption_length as any) || "medium",
        includeEmojis: campaign?.emojis ?? true,
        hashtagsCount: campaign?.hashtags_count || 4,
        ctaText: campaign?.cta_text || "Comment below!",
      });
      generatedCaption = aiResult.caption;
      generatedHashtags = aiResult.hashtags;
      imagePrompt = aiResult.imagePrompt;
      if (aiResult.imageUrl) imageUrl = aiResult.imageUrl;
    } catch (err: any) {
      console.warn("AI generation fallback to default copy:", err.message);
    }
  }

  const initialStatus = campaign?.approval_mode === "auto" ? "pending_approval" : "pending_approval";

  const newPost = await db.post_runs.create({
    data: {
      user_id: session.user.id,
      campaign_id: campaign.id,
      scheduled_for: new Date(),
      status: initialStatus,
      caption: generatedCaption,
      hashtags: generatedHashtags,
      image_prompt: imagePrompt,
      external_url: imageUrl,
      created_at: new Date(),
    },
  });

  return NextResponse.json({ data: newPost });
}
