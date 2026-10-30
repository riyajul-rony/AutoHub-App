import Link from "next/link";
import { Plus, Clock, Share2 } from "lucide-react";
import { SocialHubManager } from "@/components/social/social-hub-manager";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Social Media Auto Post — Lead Reach AI",
  description: "Schedule AI-driven posts across Facebook, Instagram, and LinkedIn.",
};

export default async function SocialOverviewPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Social Media Auto Post"
        description="Configure AI post schedules, connect your social profiles, and review approval queues."
        actions={
          <Link href="/app/social/facebook/new">
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              New Campaign
            </Button>
          </Link>
        }
      />

      {/* Dynamic Connected Accounts and Platforms Manager */}
      <SocialHubManager />

      {/* History & Approval Banner */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-bgSubtle border border-border text-fg shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-fg">Post History & Approval Queue</h2>
            <p className="text-xs text-muted">
              View upcoming scheduled posts, rejected drafts, and published live links.
            </p>
          </div>
        </div>
        <Link href="/app/social/history">
          <Button variant="secondary" size="sm">
            View History & Queue →
          </Button>
        </Link>
      </div>
    </div>
  );
}
