import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Send,
  Globe,
  Calendar,
  Star,
} from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { BatchEnrichButton, SingleLeadEnrichButton } from "@/components/leads/lead-enrichment-actions";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Search Results — AutoHub",
};

export default async function SearchRunDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const userId = user.id;

  const sp = searchParams ? await searchParams : {};
  const currentPage = Math.max(1, parseInt(sp.page || "1", 10));
  const pageSize = 50;
  const skip = (currentPage - 1) * pageSize;

  const [search, totalLeadsCount, leads] = await Promise.all([
    db.lead_searches.findFirst({
      where: { id, user_id: userId },
    }),
    db.leads.count({
      where: { search_id: id, user_id: userId },
    }),
    db.leads.findMany({
      where: { search_id: id, user_id: userId },
      take: pageSize,
      skip,
      orderBy: { collected_at: "desc" },
      select: {
        id: true,
        company_name: true,
        email: true,
        email_type: true,
        phone: true,
        phone_raw: true,
        website: true,
        rating: true,
        city: true,
        address: true,
        collected_at: true,
      },
    }),
  ]);

  if (!search) {
    notFound();
  }

  const searchParamsData = typeof search.params === "object" && search.params !== null ? (search.params as any) : {};
  const unenrichedIds = leads.filter((l: any) => !l.email).map((l: any) => l.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link
          href="/app/leads"
          className="hover:text-fg transition-colors flex items-center gap-1.5 font-medium"
        >
          <ArrowLeft size={14} /> Back to Leads
        </Link>
      </div>

      {/* Header Info Card */}
      <div className="rounded-xl border border-border bg-surface p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="neutral" size="sm" className="uppercase font-mono">
              {search.source?.replace("_", " ")}
            </Badge>
            <Badge
              variant={search.status === "completed" ? "success" : "neutral"}
              size="sm"
            >
              {search.status}
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-fg mt-2">
            {searchParamsData.keyword || "Search Run"} in {searchParamsData.location || "Anywhere"}
          </h1>
          <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1">
              <Calendar size={12} className="text-subtle" />
              {search.created_at ? new Date(search.created_at).toLocaleString() : "Recently"}
            </span>
            <span>•</span>
            <span>Found: <strong className="text-fg">{search.found_count ?? leads.length}</strong></span>
            <span>•</span>
            <span>With Email: <strong className="text-fg">{leads.filter((l: any) => l.email).length}</strong></span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <BatchEnrichButton unenrichedLeadIds={unenrichedIds} />
          <Link href={`/app/outreach/new?search_id=${search.id}`}>
            <Button variant="primary" size="sm" icon={<Send size={13} />}>
              Launch Outreach with these Leads
            </Button>
          </Link>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">
            Collected Leads ({totalLeadsCount.toLocaleString()})
          </h2>
          <span className="text-xs text-muted">Deduplicated & enriched</span>
        </div>

        {leads.length === 0 ? (
          <div className="py-12 text-center text-muted text-xs border border-dashed border-border rounded-lg">
            No leads recorded for this search run.
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
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3 text-right">Enrich</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leads.map((l: any) => (
                  <tr key={l.id} className="hover:bg-surfaceHover transition-colors">
                    <td className="py-2.5 px-3 font-medium text-fg">{l.company_name}</td>
                    <td className="py-2.5 px-3">
                      {l.email ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-fg">{l.email}</span>
                          {l.email_type && (
                            <Badge variant="neutral" size="sm" className="text-[10px] py-0 px-1">
                              {l.email_type}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-subtle italic">None</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-muted">{l.phone || l.phone_raw || "—"}</td>
                    <td className="py-2.5 px-3">
                      {l.website ? (
                        <a
                          href={l.website.startsWith("http") ? l.website : `https://${l.website}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-fg hover:underline flex items-center gap-1 max-w-[140px] truncate"
                        >
                          <Globe size={11} className="text-subtle shrink-0" />
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
                    <td className="py-2.5 px-3 text-muted truncate max-w-[200px]">
                      {l.address || l.city || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <SingleLeadEnrichButton
                        leadId={l.id}
                        hasEmail={Boolean(l.email)}
                        website={l.website}
                        companyName={l.company_name}
                      />
                    </td>
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
          basePath={`/app/leads/searches/${id}`}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
