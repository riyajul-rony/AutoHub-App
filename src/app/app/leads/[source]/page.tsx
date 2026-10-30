import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { LiveLeadsFinder } from "@/components/leads/live-leads-finder";
import { requireUser } from "@/server/auth/guards";
import { isApifyConfigured } from "@/server/providers/leads/apify/config";
import { PageHeader } from "@/components/ui/page-header";

export default async function LeadSearchSourcePage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  await requireUser();
  const { source } = await params;
  const sourceName = source.replace("_", " ").toUpperCase();
  const configured = await isApifyConfigured();

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
        description="Configure search parameters, extract businesses, and deep-crawl for contact details."
      />

      {!configured && (
        <div className="rounded-xl border border-warning/30 bg-warningBg p-5 sm:p-6 space-y-2">
          <div className="flex items-start gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-surface border border-warning/30 text-warning shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-fg">
                Service not configured, contact admin
              </h2>
              <p className="mt-1 text-xs text-muted leading-relaxed max-w-2xl">
                The lead generation service has not been configured by an administrator yet. Please contact your system administrator to activate this service.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Live Leads Finder Engine */}
      <LiveLeadsFinder source={source} isConfigured={configured} />
    </div>
  );
}
