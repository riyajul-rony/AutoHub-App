import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LiveLeadsFinder } from "@/components/leads/live-leads-finder";

export default async function LeadSearchSourcePage({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const { source } = await params;
  const sourceName = source.replace("_", " ").toUpperCase();

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/leads" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Leads
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">{sourceName} Lead Search</h1>
        <p className="mt-1 text-sm text-muted">Configure search parameters, extract businesses, and deep-crawl for verified emails.</p>
      </div>

      <LiveLeadsFinder source={source} />
    </div>
  );
}
