import OpenAI from "openai";
import { logger } from "@/server/logger";

export interface GenerateOutreachEmailInput {
  apiKey: string;
  senderName?: string | null;
  senderBusiness?: string | null;
  recipientName?: string | null;
  recipientCompany?: string | null;
  recipientWebsite?: string | null;
  recipientLocation?: string | null;
  recipientCategory?: string | null;
  goalOrOffer?: string | null;
  systemPrompt?: string | null;
  tone?: string | null;
  textModel?: string | null;
}

export interface GenerateOutreachEmailOutput {
  subject: string;
  body: string;
}

export async function generateOutreachEmail(
  input: GenerateOutreachEmailInput
): Promise<GenerateOutreachEmailOutput> {
  const model = input.textModel || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey: input.apiKey });

  const systemInstructions =
    input.systemPrompt ||
    `You are a top-tier B2B cold email strategist.
Write a concise, personalized cold email that sounds completely human, never robotic, and gets high reply rates.
Never sound spammy. Avoid buzzwords like 'synergy', 'revolutionary', 'cutting-edge'.
Keep body under 120 words.
Your response MUST be strict JSON matching this format:
{
  "subject": "Compelling, low-friction subject line",
  "body": "Natural, personalized email body"
}`;

  const promptDetails = `
Sender: ${input.senderName || "A fellow founder"} from ${input.senderBusiness || "our agency"}
Recipient Name: ${input.recipientName || "there"}
Recipient Company: ${input.recipientCompany || "your company"}
Recipient Website: ${input.recipientWebsite || "N/A"}
Location: ${input.recipientLocation || "N/A"}
Industry/Type: ${input.recipientCategory || "Local Business"}
Offer / Goal: ${input.goalOrOffer || "Help streamline local client acquisition and operations"}
Tone: ${input.tone || "Friendly, respectful, low pressure"}
`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: promptDetails },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      subject: parsed.subject || `Quick question for ${input.recipientCompany || "you"}`,
      body: parsed.body || `Hi ${input.recipientName || "there"},\n\nI came across ${input.recipientCompany || "your business"} and was really impressed. Would love to connect briefly.\n\nBest,\n${input.senderName || "AutoHub"}`,
    };
  } catch (err) {
    logger.error({ err }, "Failed to generate AI outreach email, using fallback");
    return {
      subject: `Quick question regarding ${input.recipientCompany || "your business"}`,
      body: `Hi ${input.recipientName || "there"},\n\nI was looking into ${input.recipientCompany || "your work"} and wanted to reach out regarding ${input.goalOrOffer || "potential collaboration"}.\n\nDo you have 5 minutes for a quick chat this week?\n\nBest regards,\n${input.senderName || "AutoHub"}`,
    };
  }
}
