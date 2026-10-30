import { NextRequest, NextResponse } from "next/server";
import { db } from "@/server/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const targetUrl = req.nextUrl.searchParams.get("url");

  // Validate redirect URL against open-redirect vulnerabilities
  if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
    return NextResponse.json({ error: "A valid http/https target URL parameter is required" }, { status: 400 });
  }

  try {
    const recipient = await db.campaign_recipients.findFirst({
      where: { unsubscribe_token: token },
    });

    if (recipient) {
      const campaign = await db.outreach_campaigns.findFirst({
        where: { id: recipient.campaign_id },
      });

      if (campaign?.tracking_click) {
        const ip =
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          null;
        const userAgent = req.headers.get("user-agent") || null;

        await db.campaign_recipients.update({
          where: { id: recipient.id },
          data: {
            click_count: { increment: 1 },
            first_clicked_at: recipient.first_clicked_at || new Date(),
            last_clicked_at: new Date(),
          },
        });

        try {
          if (db.tracking_events?.create) {
            await db.tracking_events.create({
              data: {
                recipient_id: recipient.id,
                campaign_id: recipient.campaign_id,
                type: "click",
                target_url: targetUrl,
                ip_address: ip,
                user_agent: userAgent,
              },
            });
          }
        } catch {}
      }
    }
  } catch {}

  // 302 Found redirect to destination
  return NextResponse.redirect(targetUrl, 302);
}
