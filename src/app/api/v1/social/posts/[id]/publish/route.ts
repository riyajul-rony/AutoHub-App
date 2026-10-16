import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { getSocialProvider } from "@/server/providers/social/registry";
import { decrypt } from "@/server/crypto";
import { trackUsageIncrement } from "@/server/billing/usage-tracker";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const postRun = await db.post_runs.findFirst({
    where: scoped(session.user.id, { id }),
    include: {
      campaign: {
        include: { social_account: true },
      },
    },
  });

  if (!postRun) {
    return NextResponse.json({ error: "Post run not found" }, { status: 404 });
  }

  // Find social account belonging strictly to current tenant
  let socialAccount = postRun.campaign?.social_account;
  if (!socialAccount && postRun.campaign?.social_account_id) {
    socialAccount = await db.social_accounts.findFirst({
      where: scoped(session.user.id, { id: postRun.campaign.social_account_id }),
    });
  }
  if (!socialAccount) {
    socialAccount = await db.social_accounts.findFirst({
      where: scoped(session.user.id),
    });
  }

  if (!socialAccount) {
    return NextResponse.json(
      { error: "No connected social account found. Please connect your Facebook, Instagram, or LinkedIn account first." },
      { status: 400 }
    );
  }

  const providerId = socialAccount.provider || "facebook";
  const externalId = socialAccount.external_id || "demo_page_id";
  let token = "mock_access_token";

  if (socialAccount.access_token_enc) {
    try {
      token = decrypt(socialAccount.access_token_enc);
    } catch {
      token = "mock_access_token";
    }
  }

  try {
    const provider = getSocialProvider(providerId);
    const fullCaption = `${postRun.caption || ""}\n\n${(postRun.hashtags || []).join(" ")}`.trim();

    const publishResult = await provider.publish(token, externalId, {
      caption: fullCaption,
      imageUrl: postRun.external_url || undefined,
    });

    const updated = await db.post_runs.update({
      where: scoped(session.user.id, { id }),
      data: {
        status: "published",
        external_post_id: publishResult.externalId,
        external_url: publishResult.url || postRun.external_url,
        approved_at: new Date(),
        finished_at: new Date(),
      },
    });

    trackUsageIncrement(session.user.id, "monthly_social_posts", 1).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Successfully published to ${providerId.toUpperCase()}!`,
    });
  } catch (err: any) {
    await db.post_runs.update({
      where: scoped(session.user.id, { id }),
      data: {
        status: "failed",
        error_message: err.message || "Failed to publish",
      },
    });
    return NextResponse.json({ error: err.message || "Publishing failed" }, { status: 500 });
  }
}
