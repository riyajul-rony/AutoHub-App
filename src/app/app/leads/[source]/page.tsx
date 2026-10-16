import Link from "next/link";
import { ArrowLeft, AlertTriangle, Key, ExternalLink } from "lucide-react";
import { LiveLeadsFinder } from "@/components/leads/live-leads-finder";
import { requireUser } from "@/server/auth/guards";
import { hasUserBrightDataKey } from "@/server/api-keys/service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";

export default async function LeadSearchSourcePage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const user = await requireUser();
  const { source } = await params;
  const sourceName = source.replace("_", " ").toUpperCase();
  const hasBrightData = await hasUserBrightDataKey(user.id);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link
          href="/app/leads"
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to Leads
        </Link>
      </div>

      <PageHeader
        title={`${sourceName} Lead Search`}
        description="Configure search parameters, extract businesses, and deep-crawl for verified emails via Bright Data."
      />

      {!hasBrightData && (
        <div className="rounded-xl border border-warning/30 bg-warningBg p-5 sm:p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface border border-warning/30 text-warning shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">
                Bright Data API Key Required in Settings
              </h2>
              <p className="mt-1 text-xs text-muted leading-relaxed max-w-2xl">
                AutoHub uses your personal Bright Data account to extract leads from {sourceName}.
                Scraping quota and credits are billed directly from your personal Bright Data balance.
                Please add and verify your API key in Settings before launching searches.
              </p>
            </div>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <Link href="/app/settings/api-keys">
              <Button variant="primary" size="sm" icon={<Key size={14} />}>
                Go to Settings → Add API Key
              </Button>
            </Link>
            <a
              href="https://brightdata.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="sm" icon={<ExternalLink size={13} />}>
                Get Bright Data Account
              </Button>
            </a>
          </div>
        </div>
      )}

      {/* Main Interactive Live Leads Finder Engine */}
      <LiveLeadsFinder source={source} />
    </div>
  );
}
