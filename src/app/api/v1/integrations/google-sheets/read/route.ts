import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getValidGoogleAccessToken, fetchSheetHeadersAndRows } from "@/server/integrations/google-sheets";
import { z } from "zod";

const readSheetSchema = z.object({
  spreadsheetIdOrUrl: z.string().min(1, "Spreadsheet ID or URL is required"),
  sheetName: z.string().optional(),
  maxRows: z.number().min(1).max(1000).optional().default(500),
});

function extractSpreadsheetId(input: string): string {
  const trimmed = input.trim();
  // Check if it's a full Google Sheets URL: https://docs.google.com/spreadsheets/d/<ID>/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

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

  const parsed = readSheetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
  }

  const spreadsheetId = extractSpreadsheetId(parsed.data.spreadsheetIdOrUrl);
  const { accessToken } = await getValidGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Google account is not connected. Please connect Google first." },
      { status: 403 }
    );
  }

  try {
    const result = await fetchSheetHeadersAndRows({
      accessToken,
      spreadsheetId,
      sheetName: parsed.data.sheetName,
      maxRows: parsed.data.maxRows,
    });

    return NextResponse.json({
      data: {
        spreadsheetId,
        ...result,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to read Google Sheet data" },
      { status: 500 }
    );
  }
}
