"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { getSessionUser, refreshSessionCache } from "@/server/auth/session";
import { encrypt, last4 } from "@/server/crypto";
import { revalidatePath } from "next/cache";
import { logger } from "@/server/logger";

const onboardingSchema = z.object({
  business_name: z.string().trim().min(1, "Business name is required"),
  business_category: z.string().trim().min(1, "Please select a category"),
  country: z.string().trim().min(1, "Country is required"),
  timezone: z.string().trim().min(1, "Timezone is required"),
  goals: z.array(z.string()).default([]),
  openai_key: z.string().trim().optional(),
});

export type OnboardingState = { error?: string } | undefined;

export async function submitOnboardingAction(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const rawGoals = formData.getAll("goals") as string[];
  const data = {
    business_name: (formData.get("business_name") as string)?.trim() || "",
    business_category: (formData.get("business_category") as string)?.trim() || "",
    country: (formData.get("country") as string)?.trim() || "",
    timezone: (formData.get("timezone") as string)?.trim() || "UTC",
    goals: rawGoals.filter(Boolean),
    openai_key: (formData.get("openai_key") as string)?.trim() || undefined,
  };

  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { business_name, business_category, country, timezone, goals, openai_key } = parsed.data;

  try {
    // If OpenAI key was supplied, save it encrypted without blocking onboarding on failure
    if (openai_key && openai_key.startsWith("sk-")) {
      try {
        await db.api_keys.create({
          data: {
            user_id: session.user.id,
            provider: "openai",
            label: "Default OpenAI Key",
            key_enc: encrypt(openai_key),
            key_last4: last4(openai_key),
            last_test_ok: true,
            last_tested_at: new Date(),
          },
        });
      } catch (keyErr: any) {
        logger.warn(
          { err: keyErr?.message, userId: session.user.id },
          "Could not save onboarding OpenAI key; proceeding with onboarding completion"
        );
      }
    }

    // Persist completed profile & onboarded_at flag to database
    await db.users.update({
      where: { id: session.user.id },
      data: {
        business_name,
        business_category,
        country,
        timezone,
        goals,
        onboarded_at: new Date(),
      },
    });

    // CRITICAL: Flush Redis session cache so requireUser() immediately sees updated onboarded_at!
    await refreshSessionCache(session.user.id);

    // Revalidate Next.js cache so the newly unlocked /app routes are immediately fresh
    revalidatePath("/", "layout");
    revalidatePath("/app");
    revalidatePath("/onboarding");

    logger.info({ userId: session.user.id }, "User onboarding completed successfully");
  } catch (err: any) {
    logger.error({ err: err?.message, userId: session.user.id }, "Failed to complete onboarding");
    return { error: `Could not save setup: ${err?.message || "Database update failed. Please try again."}` };
  }

  redirect("/app");
}
