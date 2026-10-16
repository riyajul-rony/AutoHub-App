import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { OutreachWizard } from "./outreach-wizard";

export const metadata = {
  title: "New Outreach Campaign — AutoHub",
  description: "Configure rotating sender inboxes, personalized AI copy, and safety limits.",
};

function WizardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-bgSubtle rounded-lg" />
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-bgSubtle rounded-lg" />
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-8 h-96" />
    </div>
  );
}

export default async function NewOutreachCampaignPage() {
  await requireUser();

  return (
    <div className="space-y-6 pb-16">
      {/* Top Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link
          href="/app/outreach"
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to Campaigns
        </Link>
      </div>

      <Suspense fallback={<WizardSkeleton />}>
        <OutreachWizard />
      </Suspense>
    </div>
  );
}
