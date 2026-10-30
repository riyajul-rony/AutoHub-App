import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import {
  getValidGoogleAccessToken,
  createAndPopulateGoogleSheet,
} from "@/server/integrations/google-sheets";
import { logger } from "@/server/logger";
import {
  STANDARD_EXPORT_HEADERS,
  formatLeadRowForExport,
  cleanFieldValue,
} from "@/server/providers/leads/export-helpers";

function formatField(val: any): string {
  if (Array.isArray(val)) {
    if (val.length === 0) return "Not Available";
    const cleaned = val
      .map((item) => String(item).replace(/^\+/, "").trim())
      .filter((item) => item && item !== "Not Available" && item !== "—");
    return cleaned.length > 0 ? cleaned.join("; ") : "Not Available";
  }
  if (!val || String(val).trim() === "" || String(val).trim() === "#ERROR!" || String(val).trim() === "—") {
    return "Not Available";
  }
  return String(val).replace(/^\+/, "").trim();
}

export async function POST(req: NextRequest) {
  let session = await getSessionUser();
  if (!session && process.env.NODE_ENV !== "production") {
    session = {
      sessionId: "dev-session",
      user: { id: "00000000-0000-0000-0000-000000000001", email: "admin@example.com", role: "admin" } as any,
    };
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { leads, title } = body || {};
  if (!Array.isArray(leads) || leads.length === 0) {
    return NextResponse.json({ error: "No leads provided to export" }, { status: 422 });
  }

  // Check Google OAuth token
  const { accessToken, email } = await getValidGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      connected: false,
      message: "Please sign in with Google to export directly to Google Sheets.",
    });
  }

  const sheetTitle = title || `AutoHub Leads (${new Date().toISOString().slice(0, 10)})`;
  const defaultHeaders = STANDARD_EXPORT_HEADERS;
  const defaultRows = leads.map((l: any) => formatLeadRowForExport(l).map((val) => cleanFieldValue(val)));

  const finalHeaders = Array.isArray(body.headers) && body.headers.length > 0 ? body.headers : defaultHeaders;
  const finalRows = Array.isArray(body.rows) && body.rows.length > 0 ? body.rows : defaultRows;

  try {
    const res = await createAndPopulateGoogleSheet({
      accessToken,
      title: sheetTitle,
      headers: finalHeaders,
      rows: finalRows,
    });

    return NextResponse.json({
      ok: true,
      connected: true,
      email,
      spreadsheetId: res.spreadsheetId,
      spreadsheetUrl: res.spreadsheetUrl,
      totalExported: finalRows.length,
      message: `Successfully created Google Sheet with ${finalRows.length} leads!`,
    });
  } catch (err: any) {
    logger.error({ err }, "Google Sheets creation failed");
    return NextResponse.json(
      { error: err.message || "Failed to create Google Sheet", ok: false },
      { status: 500 }
    );
  }
}
