import OpenAI from "openai";

export type GenerateContentInput = {
  apiKey: string;
  businessName?: string | null;
  businessCategory?: string | null;
  businessDescription?: string | null;
  targetAudience?: string | null;
  brandVoice?: string | null;
  language?: string;
  prompt?: string | null;
  imageStyle?: string | null;
  captionLength?: "short" | "medium" | "long";
  includeEmojis?: boolean;
  hashtagsCount?: number;
  ctaText?: string | null;
  recentCaptions?: string[];
  textModel?: string | null;
  imageModel?: string | null;
};

export type GenerateContentOutput = {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
  imageUrl?: string;
};

export async function generateSocialPost(input: GenerateContentInput): Promise<GenerateContentOutput> {
  const openai = new OpenAI({ apiKey: input.apiKey });

  const lengthDesc =
    input.captionLength === "short"
      ? "around 1-2 concise sentences (under 200 characters)"
      : input.captionLength === "long"
      ? "detailed story/educational post (around 1000-1500 characters)"
      : "medium length engaging paragraph (around 400-600 characters)";

  const systemPrompt = `You are a world-class social media copywriter and creative director.
Generate high-converting, engaging post content for the user's business.
Your response MUST be valid JSON adhering strictly to this schema:
{
  "caption": "The main post copy",
  "hashtags": ["list", "of", "tags"],
  "image_prompt": "A detailed visual prompt for DALL-E 3 image generation describing style, lighting, composition, and subject"
}`;

  const userPrompt = `
Business: ${input.businessName || "Our Brand"} (${input.businessCategory || "General"})
Description: ${input.businessDescription || "N/A"}
Audience: ${input.targetAudience || "General"}
Tone/Voice: ${input.brandVoice || "Professional & Friendly"}
Language: ${input.language || "English"}
Post Topic/Direction: ${input.prompt || "Share an engaging business update/tip"}
Desired Caption Length: ${lengthDesc}
Emojis: ${input.includeEmojis ? "Yes, use tasteful emojis" : "No, do not use emojis"}
Hashtags: Include exactly ${input.hashtagsCount ?? 5} relevant hashtags
Call To Action: ${input.ctaText || "Engage in comments"}
Image Style: ${input.imageStyle || "Photorealistic, modern cinematic lighting"}

Past recent captions (DO NOT repeat these topics or phrasing):
${(input.recentCaptions || []).slice(0, 10).map((c, i) => `${i + 1}. ${c}`).join("\n")}
`;

  // 1. Generate text copy and image prompt
  const completion = await openai.chat.completions.create({
    model: input.textModel || process.env.DEFAULT_TEXT_MODEL || "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content || "{}");
  const caption = (parsed.caption || "").trim();
  const hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags : [];
  const imagePrompt = (parsed.image_prompt || `${input.businessCategory} visual, modern premium style`).trim();

  // 2. Generate image using DALL-E
  let imageUrl: string | undefined;
  try {
    const imgRes = await openai.images.generate({
      model: input.imageModel || process.env.DEFAULT_IMAGE_MODEL || "dall-e-3",
      prompt: `${imagePrompt}. Style: ${input.imageStyle || "Photorealistic"}. Clean, no distorted text, high resolution.`,
      n: 1,
      size: "1024x1024",
    });
    imageUrl = imgRes.data?.[0]?.url;
  } catch (imgErr) {
    // If image generation fails, continue with text so preview is not completely lost
    console.error("Image generation failed:", imgErr);
  }

  return {
    caption,
    hashtags,
    imagePrompt,
    imageUrl,
  };
}
