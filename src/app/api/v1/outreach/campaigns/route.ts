import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { createOutreachCampaign, listCampaigns } from "@/server/email/campaign-service";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await listCampaigns(session.user.id);
  return NextResponse.json({ data: campaigns });
}

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const result = await createOutreachCampaign(session.user.id, body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: any) {
    const message = err?.message || "Failed to create campaign";
    const isQuotaExceeded =
      err?.code === "PLAN_LIMIT_EXCEEDED" ||
      err?.name === "PlanLimitExceededError" ||
      message.includes("Plan quota exceeded");

    const status = isQuotaExceeded ? 429 : 400;
    return NextResponse.json(
      {
        error: message,
        code: isQuotaExceeded ? "PLAN_LIMIT_EXCEEDED" : "BAD_REQUEST",
        upgradeUrl: isQuotaExceeded ? "/app/settings/billing" : undefined,
      },
      { status }
    );
  }
}
