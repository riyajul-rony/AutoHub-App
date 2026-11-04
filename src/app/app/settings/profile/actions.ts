"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { refreshSessionCache } from "@/server/auth/session";
import { revalidatePath } from "next/cache";

const profileSchema = z.object({
  name: z.string().trim().max(100).optional().nullable(),
  business_name: z.string().trim().max(100).optional().nullable(),
  timezone: z.string().trim().max(60).default("UTC"),
  sender_legal_name: z.string().trim().max(150).optional().nullable(),
  sender_address: z.string().trim().max(255).optional().nullable(),
});

export async function updateProfileAction(data: {
  name?: string | null;
  business_name?: string | null;
  timezone?: string | null;
  sender_legal_name?: string | null;
  sender_address?: string | null;
}): Promise<{ success?: boolean; error?: string }> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid profile data." };
  }

  try {
    await db.users.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name || null,
        business_name: parsed.data.business_name || null,
        timezone: parsed.data.timezone || "UTC",
        sender_legal_name: parsed.data.sender_legal_name || null,
        sender_address: parsed.data.sender_address || null,
      },
    });

    await refreshSessionCache(user.id);
    revalidatePath("/app", "layout");
    revalidatePath("/app/settings/profile");

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Failed to update profile settings." };
  }
}

