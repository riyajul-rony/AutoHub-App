import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  deleteEmailAccount,
  getDecryptedAccountCredentials,
  testSmtpConnection,
  testImapConnection,
} from "@/server/email/account-service";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteEmailAccount(session.user.id, id);
    return NextResponse.json({ success: true, message: "Account removed successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete account" }, { status: 500 });
  }
}

/**
 * Live test an existing saved account by ID without frontend needing passwords.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const acc = await getDecryptedAccountCredentials(id);
  if (!acc || acc.user_id !== session.user.id) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const smtpResult = await testSmtpConnection({
    host: acc.smtp_host || "",
    port: acc.smtp_port || 587,
    security: (acc.smtp_security as any) || "tls",
    username: acc.smtp_username || "",
    password: acc.smtp_password,
  });

  const imapResult = await testImapConnection({
    host: acc.imap_host || "",
    port: acc.imap_port || 993,
    security: (acc.imap_security as any) || "ssl",
    username: acc.imap_username || acc.smtp_username || "",
    password: acc.imap_password || acc.smtp_password,
  });

  return NextResponse.json({
    data: {
      smtp: smtpResult,
      imap: imapResult,
      allOk: smtpResult.ok && imapResult.ok,
    },
  });
}
