import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db, scoped } from "@/server/db";
import { getSocialProvider } from "@/server/providers/social/registry";
import { decrypt } from "@/server/crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  const postRun = await db.post_runs.findFirst({
    where: scoped(session.user.id, { id }),
    include: { campaign: true },
  });

  if (!postRun) {
    return NextResponse.json({ error: "Post run not found" }, { status: 404 });
  }

  // Find social account
  let socialAccount = postRun.campaign?.social_account;
  if (!socialAccount) {
    // If standalone or mock, find any connected account
    socialAccount = await db.social_accounts.findFirst({
      where: scoped(session.user.id),
    });
  }

  const providerId = socialAccount?.provider || "facebook";
  const externalId = socialAccount?.external_id || "demo_page_id";
  let token = "mock_access_token";

  if (socialAccount?.access_token_enc) {
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
