import Link from "next/link";
import { Plus, Clock } from "lucide-react";
import { SocialHubManager } from "@/components/social/social-hub-manager";

export const metadata = {
  title: "Social Media Auto Post — AutoHub",
  description: "Schedule AI-driven posts across Facebook, Instagram, and LinkedIn.",
};

export default function SocialOverviewPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Media Auto Post</h1>
          <p className="mt-1 text-sm text-muted">
            Configure AI post schedules, connect your social profiles, and review approval queues.
          </p>
        </div>
        <Link href="/app/social/facebook/new" className="btn btn-primary self-start shadow-lg shadow-brand/20">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {/* Dynamic Connected Accounts and Platforms Manager */}
      <SocialHubManager />

      {/* History & Approval Banner */}
      <div className="glass rounded-3xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 text-brand">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Post History & Approval Queue</h2>
            <p className="text-xs text-muted">View upcoming scheduled posts, rejected drafts, and published live links.</p>
          </div>
        </div>
        <Link href="/app/social/history" className="btn btn-ghost border border-border hover:border-brand/40 self-start sm:self-auto">
          View History & Queue →
        </Link>
      </div>
    </div>
  );
}
