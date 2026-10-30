import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getUserApiKey } from "@/server/api-keys/service";
import { generateOutreachEmail } from "@/server/ai/outreach-generator";
import { z } from "zod";

const previewSchema = z.object({
  leads: z.array(
    z.object({
      name: z.string().optional(),
      company: z.string().optional(),
      website: z.string().optional(),
      location: z.string().optional(),
      category: z.string().optional(),
    })
  ).min(1).max(5),
  goalOrOffer: z.string().optional(),
  tone: z.string().optional(),
  textModel: z.string().optional(),
  senderName: z.string().optional(),
});

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

  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const userKey = await getUserApiKey(session.user.id, "openai");
  const apiKey = userKey || process.env.OPENAI_API_KEY || "";

  if (!apiKey) {
    // If no OpenAI key configured in dev/test, provide simulated realistic previews
    const previews = parsed.data.leads.map((lead) => ({
      lead,
      subject: `Quick question regarding ${lead.company || "your business"}`,
      body: `Hi ${lead.name || "there"},\n\nI was reviewing ${lead.company || "your company"}${lead.website ? ` (${lead.website})` : ""} and wanted to reach out.\n\nWe specialize in ${parsed.data.goalOrOffer || "automating customer acquisition and appointment scheduling"} for businesses like yours.\n\nDo you have 5 minutes for a quick chat this Thursday or Friday?\n\nBest regards,\n${parsed.data.senderName || "Alex"}`,
    }));

    return NextResponse.json({ data: { previews } });
  }

  const previews = await Promise.all(
    parsed.data.leads.map(async (lead) => {
      const generated = await generateOutreachEmail({
        apiKey,
        senderName: parsed.data.senderName,
        recipientName: lead.name,
        recipientCompany: lead.company,
        recipientWebsite: lead.website,
        recipientLocation: lead.location,
        recipientCategory: lead.category,
        goalOrOffer: parsed.data.goalOrOffer,
        tone: parsed.data.tone,
        textModel: parsed.data.textModel || "gpt-4o-mini",
      });

      return {
        lead,
        subject: generated.subject,
        body: generated.body,
      };
    })
  );

  return NextResponse.json({ data: { previews } });
}
