import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { checkDomainDnsHealth } from "@/server/email/dns-checker";
import { z } from "zod";

const dnsCheckSchema = z.object({
  domain: z.string().min(3, "Domain name is required"),
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

  const parsed = dnsCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid domain" }, { status: 400 });
  }

  try {
    const health = await checkDomainDnsHealth(parsed.data.domain);
    return NextResponse.json({ data: health });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "DNS verification failed" }, { status: 500 });
  }
}
