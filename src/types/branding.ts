export interface SiteBranding {
  site_name: string;
  tagline: string;
  hero_title: string;
  hero_subtitle: string;
  logo_url?: string | null;
  logo_dark_url?: string | null;
  favicon_url?: string | null;
  support_email: string;
  footer_copyright: string;
  twitter_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  seo_title: string;
  seo_description: string;
  og_image?: string | null;
  updated_at?: string | null;
}

export const DEFAULT_BRANDING: SiteBranding = {
  site_name: "Lead Reach AI",
  tagline: "Modern B2B Growth & Multi-Tenant Automation Platform",
  hero_title: "Automate your growth pipeline without the chaos.",
  hero_subtitle:
    "Lead Reach AI unifies live lead scraping, AI-personalized cold outreach, multi-channel social scheduling, and smart follow-ups into a unified workspace.",
  logo_url: null,
  logo_dark_url: null,
  favicon_url: null,
  support_email: "support@cerkitlabs.tech",
  footer_copyright: "© 2026 Lead Reach AI. All rights reserved.",
  twitter_url: "",
  linkedin_url: "",
  github_url: "",
  seo_title: "Lead Reach AI — Modern B2B Marketing & Cold Outreach Engine",
  seo_description:
    "High-precision lead generation, multi-account cold email outreach, automated follow-ups, and scheduled social distribution.",
  og_image: "",
  updated_at: null,
};

