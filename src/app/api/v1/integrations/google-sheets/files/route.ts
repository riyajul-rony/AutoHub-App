import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { getValidGoogleAccessToken, listGoogleDriveSheets, getGoogleConnectionStatus } from "@/server/integrations/google-sheets";

export async function GET(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connStatus = await getGoogleConnectionStatus(session.user.id);
  if (!connStatus.connected) {
    return NextResponse.json({
      data: {
        connected: false,
        files: [],
      },
    });
  }

  const { accessToken } = await getValidGoogleAccessToken(session.user.id);
  if (!accessToken) {
    return NextResponse.json({
      data: {
        connected: false,
        needsReconnect: true,
        files: [],
      },
    });
  }

  try {
    const files = await listGoogleDriveSheets(accessToken);
    return NextResponse.json({
      data: {
        connected: true,
        email: connStatus.email,
        files,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to list Google Sheets from Drive" },
      { status: 500 }
    );
  }
}
