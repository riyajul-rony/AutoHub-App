import { ShieldCheck } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { FollowupEditor, FollowupStep } from "./followup-editor";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = {
  title: "Followup Sequence Builder — AutoHub",
  description: "Automated multi-step followup email sequence with stop-on-reply.",
};

export default async function FollowupSequenceBuilderPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const user = await requireUser();

  const seq = await db.followup_sequences.findFirst({
    where: { campaign_id: campaignId, user_id: user.id },
  });

  const initialSteps: FollowupStep[] = seq && Array.isArray((seq as any).steps) ? (seq as any).steps : [];
  const initialName = (seq as any)?.name || "Campaign Followup Sequence";

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Followup Sequence Builder"
        description="Configure automated multi-step followups with guaranteed threading and stop-on-reply protection."
      />

      {/* Safety Notice Banner */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-accent-green text-sm">
          <ShieldCheck size={16} /> Stop-On-Reply &amp; Threading Enforcement
        </div>
        <p className="text-muted leading-relaxed">
          1. <strong className="text-fg">Stop-On-Reply:</strong> When a recipient replies to any email or unsubscribes, all subsequent steps in this sequence are immediately cancelled.<br />
          2. <strong className="text-fg">Thread Preservation:</strong> Every followup is automatically dispatched using <code className="font-mono text-xs rounded bg-bgSubtle px-1.5 py-0.5 text-fg">In-Reply-To</code> and <code className="font-mono text-xs rounded bg-bgSubtle px-1.5 py-0.5 text-fg">References</code> headers matching the original email thread.
        </p>
      </div>

      <FollowupEditor
        campaignId={campaignId}
        initialSequenceName={initialName}
        initialSteps={initialSteps}
      />
    </div>
  );
}
