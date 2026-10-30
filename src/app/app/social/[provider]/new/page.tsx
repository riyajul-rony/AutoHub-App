import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignSetupForm } from "@/components/social/campaign-setup-form";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "New Campaign — Lead Reach AI Social",
  description: "Configure new AI automated posting campaign.",
};

export default async function NewCampaignPage({
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
          href={`/app/social/${provider}`}
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to {platformName} Campaigns
        </Link>
      </div>

      <PageHeader
        title={`Create ${platformName} Campaign`}
        description="Configure prompt direction, image style, daily schedule, and preview AI output."
      />

      <CampaignSetupForm provider={provider} />
    </div>
  );
}
