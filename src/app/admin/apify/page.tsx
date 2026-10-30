import Link from "next/link";
import { ArrowLeft, Cloud } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import {
  getApifySettings,
  getMaskedApifyToken,
  getApifyConfigStatus,
} from "@/server/providers/leads/apify/config";
import { Button } from "@/components/ui/button";
import { ApifyAdminForm } from "./apify-admin-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Apify Integration — Lead Reach AI Admin",
  description: "Server-side Apify API token, actor configurations, and lead generation limits.",
};

export default async function AdminApifyPage() {
  await requirePermission("settings.manage");

  const [status, maskedToken, settings] = await Promise.all([
    getApifyConfigStatus(),
    getMaskedApifyToken(),
    getApifySettings(),
  ]);

  const hasEncryptionKey = Boolean(
    process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.trim().length > 0
  );

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20 mb-2">
            <Cloud size={12} /> Lead Generation Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            Apify <span className="text-brand">Service &amp; Integration</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Centrally manage the Apify API token (AES-256-GCM encrypted), scraper actor IDs, per-module quotas, and cost estimates.
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

      <ApifyAdminForm
        initialConfigured={status.configured}
        initialReason={status.reason}
        initialLastTest={status.lastTest || null}
        initialMaskedToken={maskedToken}
        initialSettings={settings}
        hasEncryptionKey={hasEncryptionKey}
      />
    </div>
  );
}
