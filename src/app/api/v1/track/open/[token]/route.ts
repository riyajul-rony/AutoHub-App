import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

// 1x1 Transparent GIF buffer
const TRANSPARENT_1X1_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const recipient = await db.campaign_recipients.findFirst({
      where: { unsubscribe_token: token },
    });

    if (recipient) {
      const campaign = await db.outreach_campaigns.findFirst({
        where: { id: recipient.campaign_id },
      });

      if (campaign?.tracking_open) {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null;
        const userAgent = req.headers.get("user-agent") || null;

        await db.campaign_recipients.update({
          where: { id: recipient.id },
          data: {
            open_count: { increment: 1 },
            first_opened_at: recipient.first_opened_at || new Date(),
            last_opened_at: new Date(),
          },
        });

        try {
          if (db.tracking_events?.create) {
            await db.tracking_events.create({
              data: {
                recipient_id: recipient.id,
                campaign_id: recipient.campaign_id,
                type: "open",
                ip_address: ip,
                user_agent: userAgent,
              },
            });
          }
        } catch {}
      }
    }
  } catch {}

  return new NextResponse(TRANSPARENT_1X1_GIF, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_1X1_GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
