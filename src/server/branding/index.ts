import { db } from "@/server/db";
import { encrypt, decrypt } from "@/server/crypto";
import { cacheGet, cacheSet, cacheDel } from "@/server/cache";
import { logger } from "@/server/logger";
import { revalidatePath } from "next/cache";
import { SiteBranding, DEFAULT_BRANDING } from "@/types/branding";

export type { SiteBranding };
export { DEFAULT_BRANDING };

const BRANDING_SETTING_KEY = "site_branding";
const BRANDING_CACHE_KEY = "config:site_branding";
const CACHE_TTL_SECONDS = 300; // 5 minutes

export async function getSiteBranding(): Promise<SiteBranding> {
  try {
    const cached = await cacheGet<SiteBranding>(BRANDING_CACHE_KEY);
    if (cached && cached.site_name) {
      return { ...DEFAULT_BRANDING, ...cached };
    }
  } catch {}

  try {
    const row = await db.system_settings.findUnique({
      where: { key: BRANDING_SETTING_KEY },
    });

    if (row?.value_enc) {
      const decrypted = decrypt(row.value_enc);
      const parsed = JSON.parse(decrypted);
      const merged: SiteBranding = { ...DEFAULT_BRANDING, ...parsed };
      await cacheSet(BRANDING_CACHE_KEY, merged, CACHE_TTL_SECONDS);
      return merged;
    }
  } catch (err: any) {
    logger.warn({ err: err?.message }, "Failed to read site branding; using defaults");
  }

  return DEFAULT_BRANDING;
}

export async function saveSiteBranding(data: Partial<SiteBranding>): Promise<SiteBranding> {
  const current = await getSiteBranding();
  const updated: SiteBranding = {
    ...current,
    ...data,
    site_name: data.site_name?.trim() || current.site_name,
    tagline: data.tagline?.trim() || current.tagline,
    hero_title: data.hero_title?.trim() || current.hero_title,
    hero_subtitle: data.hero_subtitle?.trim() || current.hero_subtitle,
    footer_copyright: data.footer_copyright?.trim() || current.footer_copyright,
    support_email: data.support_email?.trim() || current.support_email,
    seo_title: data.seo_title?.trim() || current.seo_title,
    seo_description: data.seo_description?.trim() || current.seo_description,
    logo_url: data.logo_url !== undefined ? data.logo_url : current.logo_url,
    logo_dark_url: data.logo_dark_url !== undefined ? data.logo_dark_url : current.logo_dark_url,
    favicon_url: data.favicon_url !== undefined ? data.favicon_url : current.favicon_url,
    twitter_url: data.twitter_url !== undefined ? data.twitter_url : current.twitter_url,
    linkedin_url: data.linkedin_url !== undefined ? data.linkedin_url : current.linkedin_url,
    github_url: data.github_url !== undefined ? data.github_url : current.github_url,
    og_image: data.og_image !== undefined ? data.og_image : current.og_image,
    updated_at: new Date().toISOString(),
  };

  const encrypted = encrypt(JSON.stringify(updated));

  await db.system_settings.upsert({
    where: { key: BRANDING_SETTING_KEY },
    create: {
      key: BRANDING_SETTING_KEY,
      value_enc: encrypted,
    },
    update: {
      value_enc: encrypted,
    },
  });

  try {
    await cacheDel(BRANDING_CACHE_KEY);
  } catch {}

  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/admin/branding");

  return updated;
}
