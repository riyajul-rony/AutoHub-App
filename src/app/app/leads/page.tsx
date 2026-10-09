import Link from "next/link";
import { Download, Plus, Copy } from "lucide-react";

export const metadata = {
  title: "Lead Generation — AutoHub",
  description: "Extract verified business leads from Google Maps, Meta Ads Library, and LinkedIn.",
};

const leadSources = [
  { id: "google_maps", title: "Google Maps", desc: "Search local businesses by keyword & city with deep website email enrichment.", count: "480 Leads" },
  { id: "meta_ads", title: "Meta Ads Library", desc: "Find active advertising brands running Facebook & Instagram sponsored campaigns.", count: "140 Leads" },
  { id: "linkedin", title: "LinkedIn", desc: "Export company decision makers, job titles, and B2B professionals.", count: "320 Leads" },
];

export default function LeadsOverviewPage() {
  const sampleLeads = [
    { name: "Apex Dental Care", email: "contact@apexdental.com", phone: "+880 1711-234567", website: "apexdental.com", rating: 4.8, city: "Dhaka" },
    { name: "Dhaka Orthodontics", email: "info@dhakabraces.com", phone: "+880 1812-987654", website: "dhakabraces.com", rating: 4.9, city: "Dhaka" },
    { name: "Smile Clinic Gulshan", email: "hello@smileclinic.bd", phone: "+880 1913-456789", website: "smileclinic.bd", rating: 4.7, city: "Dhaka" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Lead Generation</h1>
          <p className="mt-1 text-sm text-muted">
            Extract verified leads with automated email finding and 1-click export to Google Sheets.
          </p>
        </div>
        <Link href="/app/leads/google_maps" className="btn btn-primary self-start">
          <Plus size={16} /> New Lead Search
        </Link>
      </div>

      {/* Sources Grid */}
      <div className="grid gap-5 md:grid-cols-3">
        {leadSources.map((s) => (
          <Link key={s.id} href={`/app/leads/${s.id}`} className="glass rounded-3xl p-6 block hover:border-brand transition">
            <div className="flex items-center justify-between">
              <span className="font-bold text-lg">{s.title}</span>
              <span className="badge">{s.count}</span>
            </div>
            <p className="mt-2 text-xs text-muted leading-relaxed">{s.desc}</p>
            <div className="mt-4 text-xs font-semibold text-brand-2">
              Launch Search Form →
            </div>
          </Link>
        ))}
      </div>

      {/* Leads Table Container */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Recent Leads Gathered</h2>
            <p className="text-xs text-muted">Enriched with verified business emails and E.164 phone numbers.</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost text-xs">
              <Copy size={14} /> Copy TSV
            </button>
            <button className="btn btn-ghost text-xs">
              <Download size={14} /> Download CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-muted uppercase">
              <tr>
                <th className="py-3 px-4">Company</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Website</th>
                <th className="py-3 px-4">Rating</th>
                <th className="py-3 px-4">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sampleLeads.map((l, i) => (
                <tr key={i} className="hover:bg-surface-2 transition">
                  <td className="py-3 px-4 font-semibold">{l.name}</td>
                  <td className="py-3 px-4 text-brand-2">{l.email}</td>
                  <td className="py-3 px-4">{l.phone}</td>
                  <td className="py-3 px-4 text-muted">{l.website}</td>
                  <td className="py-3 px-4 font-semibold text-accent-amber">★ {l.rating}</td>
                  <td className="py-3 px-4 text-muted">{l.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
