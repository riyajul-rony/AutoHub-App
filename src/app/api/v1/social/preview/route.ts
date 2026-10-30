import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { decrypt } from "@/server/crypto";
import { getUserApiKey } from "@/server/api-keys/service";
import { generateSocialPost } from "@/server/ai/social-generator";

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
    business_name,
    business_category,
    business_description,
    target_audience,
    brand_voice,
    prompt,
    image_style,
    caption_length,
    emojis,
    hashtags_count,
    cta_text,
    openai_key_id,
  } = body;

  // Retrieve user's selected or personal OpenAI key
  let rawApiKey: string | undefined;

  if (openai_key_id) {
    const keyRec = await db.api_keys.findFirst({
      where: scoped(session.user.id, { id: openai_key_id }),
    });
    if (keyRec) {
      rawApiKey = decrypt(keyRec.key_enc);
    }
  }

  if (!rawApiKey) {
    rawApiKey = (await getUserApiKey(session.user.id, "openai")) || process.env.OPENAI_API_KEY;
  }

  if (!rawApiKey) {
    // If no key configured, return mock generated content in development
    return NextResponse.json({
      data: {
        caption: `🚀 Transform your ${business_category || "business"} today!\n\n${prompt || "Consistency and innovation are the keys to long-term success."}\n\n👉 ${cta_text || "Leave a comment below!"}`,
        hashtags: ["#Automation", "#Growth", "#BusinessTips", "#LeadReachAI"],
        imagePrompt: `${business_category || "Modern office"} with sleek lighting, ultra-detailed`,
        imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
      },
    });
  }

  try {
    const generated = await generateSocialPost({
      apiKey: rawApiKey,
      businessName: business_name,
      businessCategory: business_category,
      businessDescription: business_description,
      targetAudience: target_audience,
      brandVoice: brand_voice,
      prompt,
      imageStyle: image_style,
      captionLength: caption_length || "medium",
      includeEmojis: emojis ?? true,
      hashtagsCount: Number(hashtags_count) || 5,
      ctaText: cta_text,
    });

    return NextResponse.json({ data: generated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate preview" }, { status: 500 });
  }
}
