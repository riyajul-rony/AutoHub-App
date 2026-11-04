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
import { EmptyState } from "@/components/ui/empty-state";

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
    icon: <MapPin size={15} />,
  },
  {
    id: "meta_ads",
    title: "Meta Ads Library",
    desc: "Find active advertising brands running Facebook & Instagram sponsored campaigns.",
    badge: "Direct",
    icon: <Globe size={15} />,
  },
  {
    id: "linkedin",
    title: "LinkedIn (B2B)",
    desc: "Export company decision makers, job titles, and B2B professionals.",
    badge: "B2B",
    icon: <Building2 size={15} />,
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
            className="rounded-[8px] border border-border bg-surface p-5 hover:border-borderStrong transition-colors duration-150 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-[7px] bg-bg-subtle border border-border flex items-center justify-center text-text-muted shrink-0 group-hover:border-borderStrong transition-colors">
                    {s.icon}
                  </div>
                  <span className="font-semibold text-sm text-text">{s.title}</span>
                </div>
                <Badge variant={s.id === "google_maps" ? "success" : "neutral"} size="sm" dot={s.id === "google_maps"}>
                  {s.badge}
                </Badge>
              </div>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">{s.desc}</p>
            </div>
            <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs font-medium text-text">
              <span>Launch Search Form</span>
              <span className="text-text-subtle group-hover:text-text group-hover:translate-x-0.5 transition-all">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Search Runs History */}
      {searches && searches.length > 0 && (
        <div className="rounded-[8px] border border-border bg-surface p-5 space-y-3 transition-colors duration-150 hover:border-borderStrong">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text flex items-center gap-2">
                <Search size={15} className="text-text-muted" /> Recent Search Runs
              </h2>
              <p className="text-xs text-text-muted mt-0.5">Past search runs automatically saved in your tenant database.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {searches.map((s: any) => {
              const params = typeof s.params === "object" && s.params !== null ? s.params : {};
              const isCompleted = s.status === "completed";
              return (
                <Link
                  key={s.id}
                  href={`/app/leads/searches/${s.id}`}
                  className="rounded-[8px] border border-border bg-bg-subtle p-3.5 hover:border-borderStrong transition-colors block"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-medium text-xs text-text truncate max-w-[180px]">
                      {params.keyword || "Search Run"}
                    </span>
                    <Badge variant={isCompleted ? "success" : "warning"} size="sm" dot>
                      {s.status || "completed"}
                    </Badge>
                  </div>
                  <div className="mt-1.5 text-[11px] text-text-muted flex items-center gap-1">
                    <MapPin size={11} className="text-text-subtle" /> {params.location || "Anywhere"}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted border-t border-border pt-2">
                    <span>
                      Found: <strong className="text-text">{s.found_count ?? 0}</strong>
                    </span>
                    <span className="font-medium text-text flex items-center gap-1 hover:underline">
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
      <div className="rounded-[8px] border border-border bg-surface p-5 space-y-4 transition-colors duration-150 hover:border-borderStrong">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-text">
              Gathered Leads ({totalLeadsCount.toLocaleString()})
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Enriched with verified business emails, phone numbers, and websites.
            </p>
          </div>
          {leads.length > 0 && (
            <Link href="/app/outreach/new">
              <Button variant="primary" size="sm" icon={<Send size={13} />}>
                Launch Outreach
              </Button>
            </Link>
          )}
        </div>

        {/* Table or Empty State */}
        {leads.length === 0 ? (
          <EmptyState
            icon={<Building2 size={20} />}
            title="No leads collected yet"
            description="Run your first Google Maps or Meta Ads search above to discover and enrich business contacts."
            actionLabel="Start First Search"
            actionHref="/app/leads/google_maps"
            actionIcon={<Plus size={14} />}
          />
        ) : (
          <div className="overflow-x-auto rounded-[8px] border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-bg-subtle border-b border-border text-text-muted font-medium">
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
                  <tr key={l.id || i} className="hover:bg-surface-hover transition-colors">
                    <td className="py-2.5 px-3 font-medium text-text">{l.company_name}</td>
                    <td className="py-2.5 px-3">
                      {l.email ? (
                        <span className="font-mono text-text">{l.email}</span>
                      ) : (
                        <span className="text-text-subtle italic">Not found</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">{l.phone || l.phone_raw || "—"}</td>
                    <td className="py-2.5 px-3">
                      {l.website ? (
                        <a
                          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-text hover:underline flex items-center gap-1 max-w-[150px] truncate"
                        >
                          <Globe size={11} className="text-text-subtle shrink-0" />{" "}
                          {l.website.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        <span className="text-text-subtle">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-text">
                      {l.rating ? (
                        <span className="inline-flex items-center gap-1">
                          <Star size={11} className="text-amber-500 fill-amber-500" />
                          {Number(l.rating).toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-text-muted">{l.city || l.address || "—"}</td>
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
