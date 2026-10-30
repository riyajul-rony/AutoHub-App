import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { analyzeSpamRisk } from "@/server/email/spam-checker";
import { z } from "zod";

const spamCheckSchema = z.object({
  subject: z.string().optional().default(""),
  body: z.string().optional().default(""),
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

  const parsed = spamCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const result = analyzeSpamRisk(parsed.data.subject, parsed.data.body);
  return NextResponse.json({ data: result });
}
