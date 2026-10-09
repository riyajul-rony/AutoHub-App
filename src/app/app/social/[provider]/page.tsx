import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { PlatformCampaignsList } from "@/components/social/platform-campaigns-list";

export default async function PlatformCampaignsPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const platformName = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/social" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Social Hub
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">{platformName} Campaigns</h1>
          <p className="mt-1 text-sm text-muted">Active posting schedules and automated content for your {platformName} accounts.</p>
        </div>
        <Link href={`/app/social/${provider}/new`} className="btn btn-primary self-start shadow-lg shadow-brand/20">
          <Plus size={16} /> Create {platformName} Campaign
        </Link>
      </div>

      {/* Dynamic Campaign List */}
      <PlatformCampaignsList provider={provider} />
    </div>
  );
}
