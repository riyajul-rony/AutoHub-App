import Link from "next/link";
import { Server, ArrowLeft } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { getConfig, getGlobalPlatformSettings } from "@/server/config";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { AdminSetupForm } from "./admin-setup-form";

export const metadata = {
  title: "Global Settings & Host Keys — AutoHub Admin",
  description: "Platform registration mode, maintenance mode, plan defaults, and system credentials.",
};

function maskSecret(val?: string, prefixLen = 3): string {
  if (!val || val.trim().length === 0) return "";
  const trimmed = val.trim();
  if (trimmed.length <= 8) return "••••••••";
  const start = trimmed.slice(0, prefixLen);
  const end = trimmed.slice(-4);
  return `${start}••••••••${end}`;
}

export default async function AdminSetupPage() {
  await requirePermission("settings.manage");

  const [
    globalSettings,
    activePlans,
    rawOpenaiKey,
    rawMetaAppId,
    rawMetaAppSecret,
    rawGoogleClientId,
    rawGoogleClientSecret,
  ] = await Promise.all([
    getGlobalPlatformSettings(),
    db.plans
      .findMany({
        where: { is_active: true },
        select: { id: true, name: true, slug: true, monthly_price: true },
        orderBy: { monthly_price: "asc" },
      })
      .catch(() => []),
    getConfig("OPENAI_API_KEY"),
    getConfig("META_APP_ID"),
    getConfig("META_APP_SECRET"),
    getConfig("GOOGLE_CLIENT_ID"),
    getConfig("GOOGLE_CLIENT_SECRET"),
  ]);

  const credentials = {
    openaiConfigured: Boolean(rawOpenaiKey),
    openaiKeyMasked: maskSecret(rawOpenaiKey, 3),

    metaConfigured: Boolean(rawMetaAppId && rawMetaAppSecret),
    metaAppId: rawMetaAppId || "",
    metaAppSecretMasked: maskSecret(rawMetaAppSecret, 0),

    googleConfigured: Boolean(rawGoogleClientId && rawGoogleClientSecret),
    googleClientId: rawGoogleClientId || "",
    googleClientSecretMasked: maskSecret(rawGoogleClientSecret, 0),
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20 mb-2">
            <Server size={12} /> Master Control &amp; Host Configuration
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg flex items-center gap-2.5">
            Global Settings &amp; <span className="text-brand">Credentials</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Manage registration access, maintenance switch, platform defaults, and encrypted API credentials.
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

      <AdminSetupForm
        initialGlobal={globalSettings}
        initialCredentials={credentials}
        availablePlans={activePlans as any}
      />
    </div>
  );
}
