import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { generateSocialPost } from "@/server/ai/social-generator";
import { decrypt } from "@/server/crypto";

export async function GET() {
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

  const posts = await db.post_runs.findMany({
    where: scoped(session.user.id),
    include: { campaign: true },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return NextResponse.json({ data: posts });
}

export async function POST(req: NextRequest) {
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

  // Get user's API key if available
  let apiKey = process.env.OPENAI_API_KEY;
  if (campaign?.openai_key_id) {
    const keyRec = await db.api_keys.findFirst({
      where: scoped(session.user.id, { id: campaign.openai_key_id }),
    });
    if (keyRec) apiKey = decrypt(keyRec.key_enc);
  }

  const businessCategory = campaign?.business_category || "Business Growth";
  const businessName = campaign?.business_name || "AutoHub";
  const prompt = campaign?.prompt || "Daily motivation, client success tip, and engagement question";
  const brandVoice = campaign?.brand_voice || "Professional";

  let generatedCaption = `🚀 Level up your ${businessCategory} today!\n\nConsistency and authentic value are the keys to long-term success. Stay focused on your goals.\n\n👉 Share your thoughts in the comments!`;
  let generatedHashtags = ["#Automation", "#Growth", "#Success", "#AutoHub"];
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

  // Determine initial status based on campaign approval mode
  const initialStatus = campaign?.approval_mode === "auto" ? "pending_approval" : "pending_approval";

  const newPost = await db.post_runs.create({
    data: {
      user_id: session.user.id,
      campaign_id: campaign?.id || "standalone-test",
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
