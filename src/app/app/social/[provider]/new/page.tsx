import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { CampaignSetupForm } from "@/components/social/campaign-setup-form";

export const metadata = {
  title: "New Campaign — AutoHub Social",
  description: "Configure new AI automated posting campaign.",
};

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  const platformName = provider.charAt(0).toUpperCase() + provider.slice(1);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href={`/app/social/${provider}`} className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to {platformName} Campaigns
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Create {platformName} Campaign</h1>
        <p className="mt-1 text-sm text-muted">
          Configure prompt direction, image style, daily schedule, and preview AI output.
        </p>
      </div>

      <CampaignSetupForm provider={provider} />
    </div>
  );
}
