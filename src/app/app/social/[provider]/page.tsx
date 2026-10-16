import Link from "next/link";
import { Plus, ArrowLeft } from "lucide-react";
import { PlatformCampaignsList } from "@/components/social/platform-campaigns-list";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function PlatformCampaignsPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  await requireUser();
  const { provider } = await params;
  const platformName = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link
          href="/app/social"
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to Social Hub
        </Link>
      </div>

      <PageHeader
        title={`${platformName} Campaigns`}
        description={`Active posting schedules and automated content for your ${platformName} accounts.`}
        actions={
          <Link href={`/app/social/${provider}/new`}>
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              Create {platformName} Campaign
            </Button>
          </Link>
        }
      />

      {/* Dynamic Campaign List */}
      <PlatformCampaignsList provider={provider} />
    </div>
  );
}
