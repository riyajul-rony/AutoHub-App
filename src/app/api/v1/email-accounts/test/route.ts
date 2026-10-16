import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { testSmtpConnection, testImapConnection } from "@/server/email/account-service";
import { z } from "zod";

const testSchema = z.object({
  smtp: z
    .object({
      host: z.string().min(1, "SMTP host is required"),
      port: z.coerce.number().min(1).max(65535),
      security: z.enum(["ssl", "tls", "starttls", "none"]).optional(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
  imap: z
    .object({
      host: z.string().min(1, "IMAP host is required"),
      port: z.coerce.number().min(1).max(65535),
      security: z.enum(["ssl", "tls", "starttls", "none"]).optional(),
      username: z.string().min(1, "IMAP username is required"),
      password: z.string().min(1, "IMAP password is required"),
    })
    .optional(),
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = testSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Validation failed" }, { status: 400 });
  }

  const results: {
    smtp?: { ok: boolean; message?: string; error?: string };
    imap?: { ok: boolean; message?: string; error?: string };
  } = {};

  if (parsed.data.smtp) {
    results.smtp = await testSmtpConnection(parsed.data.smtp as any);
  }

  if (parsed.data.imap) {
    results.imap = await testImapConnection(parsed.data.imap as any);
  }

  return NextResponse.json({
    data: results,
    success: (results.smtp ? results.smtp.ok : true) && (results.imap ? results.imap.ok : true),
  });
}
