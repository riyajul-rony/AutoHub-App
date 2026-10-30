import Link from "next/link";
import {
  Download,
  Plus,
  Search,
  Send,
  ExternalLink,
  MapPin,
  Globe,
  AlertTriangle,
  Star,
  Building2,
} from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { isApifyConfigured } from "@/server/providers/leads/apify/config";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Lead Generation — Lead Reach AI",
  description: "Extract business leads from Google Maps, Meta Ads Library, and LinkedIn.",
};

const leadSources = [
  {
    id: "google_maps",
    title: "Google Maps",
    desc: "Search local businesses by keyword & city with deep website email enrichment.",
    badge: "Active",
  },
  {
    id: "meta_ads",
    title: "Meta Ads Library",
    desc: "Find active advertising brands running Facebook & Instagram sponsored campaigns.",
    badge: "Direct",
  },
  {
    id: "linkedin",
    title: "LinkedIn (B2B)",
    desc: "Export company decision makers, job titles, and B2B professionals.",
    badge: "B2B",
  },
];

export default async function LeadsOverviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const userId = user.id;

  const sp = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const [realLeads, totalLeadsCount, searches, configured] = await Promise.all([
    db.leads.findMany({
      where: { user_id: userId },
      take: pageSize,
      skip,
      orderBy: { collected_at: "desc" },
      select: {
        id: true,
        company_name: true,
        email: true,
        phone: true,
        phone_raw: true,
        website: true,
        rating: true,
        city: true,
        address: true,
        collected_at: true,
      },
    }),
    db.leads.count({ where: { user_id: userId } }),
    db.lead_searches.findMany({
      where: { user_id: userId },
      take: 6,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        source: true,
        status: true,
        found_count: true,
        enriched_count: true,
        created_at: true,
        params: true,
      },
    }),
    isApifyConfigured(),
  ]);

  const leads = realLeads;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Lead Generation"
        description="Extract business leads with automated email finding, deduplication, and 1-click outreach."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/app/outreach/new">
              <Button variant="secondary" size="sm" icon={<Send size={14} />}>
                Launch Outreach
              </Button>
            </Link>
            <Link href="/app/leads/google_maps">
              <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={!configured}>
                New Search
              </Button>
            </Link>
          </div>
        }
      />

      {/* Service Not Configured Banner */}
      {!configured && (
        <div className="rounded-xl border border-warning/30 bg-warningBg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-surface border border-warning/30 text-warning shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-fg">Service not configured, contact admin</h3>
              <p className="mt-0.5 text-xs text-muted leading-relaxed">
                The lead generation engine has not been configured with an active server provider key yet. Please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sources Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        {leadSources.map((s) => (
          <Link
            key={s.id}
            href={`/app/leads/${s.id}`}
            className="rounded-xl border border-border bg-surface p-5 hover:border-borderStrong transition-all duration-150 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-base text-fg">{s.title}</span>
                <Badge variant="neutral" size="sm">
                  {s.badge}
                </Badge>
              </div>
              <p className="mt-2 text-xs text-muted leading-relaxed">{s.desc}</p>
            </div>
            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-fg">
              <span>Launch Search Form</span>
              <span className="text-muted group-hover:text-fg group-hover:translate-x-0.5 transition-all">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Search Runs History */}
      {searches && searches.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                <Search size={15} className="text-muted" /> Recent Search Runs
              </h2>
              <p className="text-xs text-muted">Past search runs automatically saved in your tenant database.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((s: any) => {
              const params = typeof s.params === "object" && s.params !== null ? s.params : {};
              return (
                <Link
                  key={s.id}
                  href={`/app/leads/searches/${s.id}`}
                  className="rounded-lg border border-border bg-bgSubtle p-3.5 hover:border-borderStrong transition-colors block"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-fg truncate max-w-[180px]">
                      {params.keyword || "Search Run"}
                    </span>
                    <Badge variant={s.status === "completed" ? "success" : "neutral"} size="sm">
                      {s.status || "completed"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted flex items-center gap-1">
                    <MapPin size={11} className="text-subtle" /> {params.location || "Anywhere"}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted border-t border-border pt-2">
                    <span>
                      Found: <strong className="text-fg">{s.found_count ?? 0}</strong>
                    </span>
                    <span className="font-medium text-fg flex items-center gap-1 hover:underline">
                      View Leads <ExternalLink size={10} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Leads Table Container */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-fg">
              Gathered Leads ({totalLeadsCount.toLocaleString()})
            </h2>
            <p className="text-xs text-muted">
              Enriched with verified business emails, phone numbers, and websites.
            </p>
          </div>
          {leads.length > 0 && (
            <Link href="/app/outreach/new">
              <Button variant="secondary" size="sm" icon={<Send size={13} />}>
                Send Outreach
              </Button>
            </Link>
          )}
        </div>

        {/* Table or Empty State */}
        {leads.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-border rounded-lg space-y-2">
            <Building2 size={24} className="mx-auto text-muted" />
            <div className="text-sm font-medium text-fg">No leads collected yet</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              Run your first Google Maps or Meta Ads search above to discover and enrich business contacts.
            </p>
            <div className="pt-2">
              <Link href="/app/leads/google_maps">
                <Button variant="primary" size="sm" icon={<Plus size={14} />} disabled={!configured}>
                  Start First Search
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgSubtle border-b border-border text-muted font-medium">
                <tr>
                  <th className="py-2.5 px-3">Company</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Website</th>
                  <th className="py-2.5 px-3">Rating</th>
                  <th className="py-2.5 px-3">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l: any, i: number) => (
                  <tr key={l.id || i} className="hover:bg-surfaceHover transition-colors">
                    <td className="py-2.5 px-3 font-medium text-fg">{l.company_name}</td>
                    <td className="py-2.5 px-3">
                      {l.email ? (
                        <span className="font-mono text-fg">{l.email}</span>
                      ) : (
                        <span className="text-subtle italic">Not found</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted">{l.phone || l.phone_raw || "—"}</td>
                    <td className="py-2.5 px-3">
                      {l.website ? (
                        <a
                          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-fg hover:underline flex items-center gap-1 max-w-[150px] truncate"
                        >
                          <Globe size={11} className="text-subtle shrink-0" />{" "}
                          {l.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-fg">
                      {l.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} className="text-warning fill-warning" />
                          {Number(l.rating).toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted">{l.city || l.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalCount={totalLeadsCount}
          pageSize={pageSize}
          basePath="/app/leads"
          searchParams={sp}
        />
      </div>
    </div>
  );
}
