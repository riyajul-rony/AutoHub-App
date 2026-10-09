import Link from "next/link";
import { Plus, Clock, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Social Media Auto Post — AutoHub",
  description: "Schedule AI-driven posts across Facebook, Instagram, and LinkedIn.",
};

const platforms = [
  { id: "facebook", name: "Facebook", desc: "Auto post to Facebook Pages with custom AI graphics", href: "/app/social/facebook", connected: true },
  { id: "instagram", name: "Instagram", desc: "Publish photo carousels & single images to IG Business accounts", href: "/app/social/instagram", connected: false },
  { id: "linkedin", name: "LinkedIn", desc: "Share thought-leadership articles & updates to your profile", href: "/app/social/linkedin", connected: false },
];

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
        <Link href="/app/social/facebook/new" className="btn btn-primary self-start">
          <Plus size={16} /> New Campaign
        </Link>
      </div>

      {/* Platforms Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {platforms.map((p) => (
          <div key={p.id} className="glass rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">{p.name}</span>
                {p.connected ? (
                  <span className="badge border-accent-green/40 text-accent-green">
                    <CheckCircle2 size={13} /> Connected
                  </span>
                ) : (
                  <span className="badge border-border text-muted">Not Connected</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">{p.desc}</p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-border">
              <Link href={p.href} className="btn btn-ghost !p-2 text-xs">
                Manage Campaigns →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* History & Approval Banner */}
      <div className="glass rounded-3xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 text-brand">
            <Clock size={24} />
          </div>
          <div>
            <h2 className="font-bold text-lg">Post History & Approval Queue</h2>
            <p className="text-xs text-muted">View upcoming scheduled posts, rejected drafts, and published links.</p>
          </div>
        </div>
        <Link href="/app/social/history" className="btn btn-ghost">
          View History
        </Link>
      </div>
    </div>
  );
}
