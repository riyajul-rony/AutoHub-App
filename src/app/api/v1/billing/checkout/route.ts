import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { getPaymentProvider, getDefaultProviderId } from "@/server/billing/providers/registry";

export async function POST(req: NextRequest) {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { planId, interval = "monthly" } = body;
  if (!planId) {
    return NextResponse.json({ error: "planId is required" }, { status: 400 });
  }

  const plan = await db.plans.findUnique({ where: { id: planId } });
  if (!plan || !plan.is_active) {
    return NextResponse.json({ error: "Plan not found or inactive" }, { status: 404 });
  }

  const amount =
    interval === "yearly" ? Number(plan.price_yearly || 0) : Number(plan.price_monthly || 0);

  const defaultProviderId = await getDefaultProviderId();
  const provider = getPaymentProvider(defaultProviderId);

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  try {
    const result = await provider.createCheckout({
      userId: session.user.id,
      userEmail: session.user.email || "",
      userName: session.user.name || undefined,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      amount,
      currency: plan.currency || "USD",
      interval,
      successUrl: `${appUrl}/app/settings/billing?success=true`,
      cancelUrl: `${appUrl}/app/settings/billing?canceled=true`,
      metadata: {
        userId: session.user.id,
        planId: plan.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to initialize checkout" },
      { status: 500 }
    );
  }
}
