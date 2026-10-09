import Link from "next/link";
import { Plus, ArrowLeft, Pause } from "lucide-react";

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
          <p className="mt-1 text-sm text-muted">Active posting schedules and connected {platformName} accounts.</p>
        </div>
        <Link href={`/app/social/${provider}/new`} className="btn btn-primary self-start">
          <Plus size={16} /> Create {platformName} Campaign
        </Link>
      </div>

      {/* Campaign List */}
      <div className="glass rounded-3xl p-6 divide-y divide-border">
        <div className="py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-base">Daily Property Insights</span>
              <span className="badge border-accent-green/40 text-accent-green">Active</span>
            </div>
            <p className="text-xs text-muted mt-1">Posts daily at 10:00 AM & 06:00 PM • Professional Brand Voice</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost !p-2 text-xs" title="Pause Campaign">
              <Pause size={14} />
            </button>
            <Link href={`/app/social/${provider}/1`} className="btn btn-ghost !p-2 text-xs">
              Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
