import { Share2, Mail, Repeat2, ArrowUpRight, TrendingUp, Users, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Dashboard — AutoHub",
  description: "Monitor your automations, leads, and outreach campaigns in real time.",
};

export default function DashboardPage() {
  const stats = [
    { label: "Total Leads Gathered", val: "1,248", change: "+18%", icon: Users, color: "text-brand-2" },
    { label: "Social Posts Published", val: "84", change: "+6%", icon: Share2, color: "text-brand" },
    { label: "Emails Dispatched", val: "3,410", change: "+24%", icon: Mail, color: "text-accent-pink" },
    { label: "Reply Conversion Rate", val: "14.2%", change: "+2.1%", icon: Repeat2, color: "text-accent-green" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Performance Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Real-time overview of active automations across your connected channels.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted">{s.label}</span>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-3xl font-bold">{s.val}</span>
              <span className="flex items-center text-xs font-semibold text-accent-green">
                <TrendingUp size={12} className="mr-0.5" /> {s.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Needs Attention & Quick Launcher */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Needs Attention Panel */}
        <div className="glass rounded-3xl p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Needs Attention</h2>
            <span className="badge border-accent-amber/40 text-accent-amber">2 Pending</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent-amber/20 text-accent-amber">
                  <AlertCircle size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold">1 Post Pending Approval</div>
                  <div className="text-xs text-muted">Facebook Page • Scheduled today at 4:30 PM</div>
                </div>
              </div>
              <Link href="/app/social/history" className="btn btn-ghost !p-2 text-xs">
                Review Post
              </Link>
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/20 text-brand">
                  <CheckCircle size={20} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Google Maps Search Completed</div>
                  <div className="text-xs text-muted">Dentists in Dhaka • 85 leads enriched with emails</div>
                </div>
              </div>
              <Link href="/app/leads" className="btn btn-ghost !p-2 text-xs">
                View Leads
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Launch Panel */}
        <div className="glass rounded-3xl p-6 space-y-4">
          <h2 className="text-lg font-bold">Quick Actions</h2>
          <div className="space-y-2">
            <Link href="/app/social/facebook" className="btn btn-ghost w-full justify-between">
              <span>Create Social Campaign</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/app/leads/google_maps" className="btn btn-ghost w-full justify-between">
              <span>Run Lead Search</span>
              <ArrowUpRight size={16} />
            </Link>
            <Link href="/app/outreach/new?mode=ai" className="btn btn-ghost w-full justify-between">
              <span>Start AI Outreach</span>
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
