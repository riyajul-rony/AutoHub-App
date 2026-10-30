import Link from "next/link";
import { Plus, ArrowRight, Mail, Layers } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Followup Sequences — Lead Reach AI",
  description: "Automate sequence followup emails in the same thread until the prospect replies.",
};

export default async function FollowupOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await requireUser();

  const sp = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const [userCampaigns, totalCampaignsCount, rawSequences] = await Promise.all([
    db.outreach_campaigns.findMany({
      where: { user_id: user.id },
      take: pageSize,
      skip,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        mode: true,
        created_at: true,
      },
    }),
    db.outreach_campaigns.count({ where: { user_id: user.id } }),
    db.followup_sequences.findMany({
      where: { user_id: user.id },
      select: {
        id: true,
        campaign_id: true,
        name: true,
        status: true,
        steps: {
          select: { id: true },
        },
      },
    }),
  ]);

  const sequenceMap = new Map<string, any>();
  for (const seq of rawSequences) {
    if (seq.campaign_id) {
      sequenceMap.set(seq.campaign_id, seq);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Followup Sequences"
        description="Automatically sends follow-ups in the same email thread with In-Reply-To headers. Stops immediately when a reply is detected."
        actions={
          <Link href="/app/outreach/new">
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              New Sequence
            </Button>
          </Link>
        }
      />

      {userCampaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center space-y-3 max-w-md mx-auto">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-bgSubtle border border-border text-fg mx-auto">
            <Mail size={22} />
          </div>
          <h2 className="text-sm font-semibold text-fg">No Campaigns Configured</h2>
          <p className="text-xs text-muted leading-relaxed">
            Followup sequences attach directly to outreach campaigns. Create an outreach campaign first to start automating thread followups.
          </p>
          <div className="pt-2">
            <Link href="/app/outreach/new">
              <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                Create Outreach Campaign
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div className="divide-y divide-border">
            {userCampaigns.map((c: any) => {
              const seq = sequenceMap.get(c.id);
              const stepCount = seq?.steps?.length || 2;
              const seqStatus = seq?.status || "active";

              return (
                <div
                  key={c.id}
                  className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm text-fg">
                        {seq?.name || `${c.name} Sequence`}
                      </span>
                      <Badge
                        variant={seqStatus === "active" ? "success" : "neutral"}
                        size="sm"
                      >
                        {seqStatus}
                      </Badge>
                      <Badge variant="neutral" size="sm">
                        {stepCount} Steps
                      </Badge>
                      <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-mono">
                        {c.mode}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted mt-1">
                      Campaign: <strong className="text-fg">{c.name}</strong> • Status: {c.status}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/app/followup/${c.id}`}>
                      <Button variant="secondary" size="sm" icon={<ArrowRight size={13} />}>
                        Configure Steps
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            currentPage={currentPage}
            totalCount={totalCampaignsCount}
            pageSize={pageSize}
            basePath="/app/followup"
            searchParams={sp}
          />
        </div>
      )}
    </div>
  );
}
