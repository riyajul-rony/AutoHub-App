import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  deleteEmailAccount,
  getDecryptedAccountCredentials,
  updateEmailAccount,
  testSmtpConnection,
  testImapConnection,
} from "@/server/email/account-service";
import { db } from "@/server/db";
import { ensureFreshGoogleAccessToken } from "@/server/email/google-oauth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const account = await db.email_accounts.findFirst({
    where: { id, user_id: session.user.id },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { smtp_password_enc, imap_password_enc, oauth_access_token_enc, oauth_refresh_token_enc, ...safe } = account;
  return NextResponse.json({
    data: {
      ...safe,
      has_smtp_password: Boolean(smtp_password_enc),
      has_imap_password: Boolean(imap_password_enc),
      has_oauth_token: Boolean(oauth_refresh_token_enc || oauth_access_token_enc),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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

  try {
    const updated = await updateEmailAccount(session.user.id, id, body);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update account" }, { status: 400 });
  }
}

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
 * If account uses Gmail API, verifies OAuth token refresh validity.
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

  if (acc.provider === "gmail_api") {
    try {
      await ensureFreshGoogleAccessToken(id);
      return NextResponse.json({
        data: {
          smtp: { ok: true, message: "Google Gmail API token is valid & ready to dispatch." },
          imap: { ok: true, message: "Google OAuth connected." },
          allOk: true,
        },
      });
    } catch (gErr: any) {
      return NextResponse.json({
        data: {
          smtp: { ok: false, error: gErr.message || "Google authorization expired" },
          imap: { ok: false, error: "Reconnect needed" },
          allOk: false,
        },
      });
    }
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
