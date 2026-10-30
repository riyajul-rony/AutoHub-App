import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { encrypt } from "@/server/crypto";
import { getGoogleClientCredentials } from "@/server/integrations/google-sheets";

const DEV_KEY_B64 = Buffer.alloc(32, "leadreach-dev-master-config-key").toString("base64");
function encKey(): string | undefined {
  if (process.env.APP_ENCRYPTION_KEY) return undefined;
  return DEV_KEY_B64;
}

import { hasPermission } from "@/server/auth/permissions";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(session.user.role, "settings.manage")) {
    return NextResponse.json({ error: "Forbidden: settings.manage permission required" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { clientId, clientSecret } = body || {};
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "Both clientId and clientSecret are required." }, { status: 422 });
  }

  const cleanId = String(clientId).trim();
  const cleanSecret = String(clientSecret).trim();

  try {
    const key = encKey();
    await db.system_settings.upsert({
      where: { key: "GOOGLE_CLIENT_ID" },
      create: { key: "GOOGLE_CLIENT_ID", value_enc: encrypt(cleanId, key) },
      update: { value_enc: encrypt(cleanId, key) },
    });

    await db.system_settings.upsert({
      where: { key: "GOOGLE_CLIENT_SECRET" },
      create: { key: "GOOGLE_CLIENT_SECRET", value_enc: encrypt(cleanSecret, key) },
      update: { value_enc: encrypt(cleanSecret, key) },
    });

    const creds = await getGoogleClientCredentials();

    return NextResponse.json({
      ok: true,
      message: "Google OAuth credentials saved successfully.",
      configured: creds.configured,
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to save Google credentials: " + err.message }, { status: 500 });
  }
}
