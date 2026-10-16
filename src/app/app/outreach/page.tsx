import Link from "next/link";
import { Mail, Plus, Sparkles, Send, ChevronRight } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { listCampaigns } from "@/server/email/campaign-service";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Outreach — AutoHub",
  description: "Create AI-personalized or custom cold outreach email campaigns with account rotation.",
};

export default async function OutreachOverviewPage() {
  const user = await requireUser();
  const userId = user.id;

  const realCampaigns = await listCampaigns(userId);
  const campaigns = realCampaigns;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Outreach"
        description="Safe cold emailing with hard 25/hour account limit, multi-inbox rotation, and stop-on-reply."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/outreach/email-accounts">
              <Button variant="secondary" size="sm" icon={<Mail size={14} />}>
                Sender Accounts
              </Button>
            </Link>
            <Link href="/app/outreach/new?mode=ai">
              <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                New Campaign
              </Button>
            </Link>
          </div>
        }
      />

      {/* Campaign Mode Selection Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/outreach/new?mode=ai"
          className="rounded-xl border border-border bg-surface p-6 block hover:border-borderStrong transition-all duration-150 group"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-bgSubtle border border-border text-fg">
              <Sparkles size={20} />
            </span>
            <Badge variant="accent" size="sm">
              AI Powered
            </Badge>
          </div>
          <h2 className="mt-4 font-bold text-lg text-fg">AI Personalized Message</h2>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            AI generates dynamic, customized email copy for each lead right before sending based on company details and website context.
          </p>
          <div className="mt-4 text-xs font-semibold text-fg flex items-center gap-1">
            <span>Launch AI Wizard</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>

        <Link
          href="/app/outreach/new?mode=custom"
          className="rounded-xl border border-border bg-surface p-6 block hover:border-borderStrong transition-all duration-150 group"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-bgSubtle border border-border text-fg">
              <Send size={20} />
            </span>
            <Badge variant="neutral" size="sm">
              Variable Template
            </Badge>
          </div>
          <h2 className="mt-4 font-bold text-lg text-fg">Custom Message Template</h2>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Write your own high-performing email copy using variables like <code className="font-mono text-fg">{"{{first_name|there}}"}</code> and <code className="font-mono text-fg">{"{{company_name}}"}</code>.
          </p>
          <div className="mt-4 text-xs font-semibold text-fg flex items-center gap-1">
            <span>Launch Custom Wizard</span>
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </Link>
      </div>

      {/* Active Campaigns Table */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">Campaigns ({campaigns.length})</h2>
          <Badge variant="success" size="sm">
            Active Inboxes Rotating
          </Badge>
        </div>

        {campaigns.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted border border-dashed border-border rounded-lg space-y-2">
            <Mail size={24} className="mx-auto text-muted" />
            <div className="text-sm font-medium text-fg">No email campaigns created yet</div>
            <p className="max-w-sm mx-auto">
              Launch an AI-powered or custom template campaign to begin automated cold email dispatches.
            </p>
            <div className="pt-2">
              <Link href="/app/outreach/new?mode=ai">
                <Button variant="primary" size="sm" icon={<Plus size={14} />}>
                  Create First Campaign
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {campaigns.map((c: any) => (
              <div
                key={c.id}
                className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-fg">{c.name}</span>
                    <Badge variant="neutral" size="sm" className="text-[10px] uppercase font-mono">
                      {c.mode === "ai" ? "AI Mode" : "Template"}
                    </Badge>
                    <Badge
                      variant={
                        c.status === "running"
                          ? "success"
                          : c.status === "paused"
                          ? "warning"
                          : "neutral"
                      }
                      size="sm"
                      className="text-[10px] uppercase"
                    >
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted mt-1">
                    Dispatched: {c.sentCount ?? 0}/{c.totalRecipients ?? 0} leads • Responses: {c.repliesCount ?? 0}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/app/followup/${c.id}`}>
                    <Button variant="secondary" size="sm">
                      Follow-up
                    </Button>
                  </Link>
                  <Link href={`/app/outreach/${c.id}`}>
                    <Button variant="secondary" size="sm" icon={<ChevronRight size={13} />}>
                      Analytics & Logs
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
