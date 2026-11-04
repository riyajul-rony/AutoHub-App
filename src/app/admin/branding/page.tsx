import Link from "next/link";
import { ArrowLeft, Palette } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { getSiteBranding } from "@/server/branding";
import { Button } from "@/components/ui/button";
import { BrandingForm } from "./branding-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Branding & Site Content — Lead Reach AI Admin",
  description: "Customize site name, logo, hero copy, footer, and SEO metadata.",
};

export default async function AdminBrandingPage() {
  await requirePermission("settings.manage");
  const branding = await getSiteBranding();

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-2">
            <Palette size={12} /> Customizer &amp; CMS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            Branding &amp; <span className="text-primary">Site Content</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Centrally manage your SaaS name, logo, landing page headline, footer copyright, and SEO metadata without editing code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Overview
            </Button>
          </Link>
        </div>
      </div>

      <BrandingForm initialBranding={branding} />
    </div>
  );
}

