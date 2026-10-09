"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/server/db";
import { getSessionUser } from "@/server/auth/session";
import { encrypt, last4 } from "@/server/crypto";
import { revalidatePath } from "next/cache";

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
    business_name: formData.get("business_name") as string,
    business_category: formData.get("business_category") as string,
    country: formData.get("country") as string,
    timezone: formData.get("timezone") as string,
    goals: rawGoals,
    openai_key: (formData.get("openai_key") as string) || undefined,
  };

  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { business_name, business_category, country, timezone, goals, openai_key } = parsed.data;

  // If OpenAI key was supplied, save it encrypted
  if (openai_key && openai_key.startsWith("sk-")) {
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
  }

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

  revalidatePath("/app");
  redirect("/app");
}
