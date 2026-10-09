import Link from "next/link";
import { Mail, Plus, Sparkles, Send } from "lucide-react";

export const metadata = {
  title: "Outreach — AutoHub",
  description: "Create AI-personalized or custom cold outreach email campaigns with account rotation.",
};

export default function OutreachOverviewPage() {
  const campaigns = [
    { id: "1", name: "Dhaka Dentists Automation Pitch", mode: "AI Message", status: "Running", sent: "120/350", replies: "14" },
    { id: "2", name: "Gulshan Real Estate Software", mode: "Custom Template", status: "Completed", sent: "200/200", replies: "28" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Email Outreach</h1>
          <p className="mt-1 text-sm text-muted">
            Safe cold emailing with hard 25/hour account limit, multi-inbox rotation, and stop-on-reply.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/app/outreach/email-accounts" className="btn btn-ghost">
            <Mail size={16} /> Sender Accounts
          </Link>
          <Link href="/app/outreach/new?mode=ai" className="btn btn-primary">
            <Plus size={16} /> New Campaign
          </Link>
        </div>
      </div>

      {/* Campaign Mode Selection Cards */}
      <div className="grid gap-5 sm:grid-cols-2">
        <Link href="/app/outreach/new?mode=ai" className="glass rounded-3xl p-6 block hover:border-brand transition">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/20 text-brand">
              <Sparkles size={24} />
            </span>
            <span className="badge border-brand text-brand">AI Powered</span>
          </div>
          <h2 className="mt-4 font-bold text-xl">AI Personalized Message</h2>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            AI generates dynamic, customized email copy for each lead right before sending based on company details and website context.
          </p>
          <div className="mt-4 text-xs font-semibold text-brand-2">Launch AI Wizard →</div>
        </Link>

        <Link href="/app/outreach/new?mode=custom" className="glass rounded-3xl p-6 block hover:border-brand-2 transition">
          <div className="flex items-center justify-between">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-2/20 text-brand-2">
              <Send size={24} />
            </span>
            <span className="badge">Variable Template</span>
          </div>
          <h2 className="mt-4 font-bold text-xl">Custom Message Template</h2>
          <p className="mt-2 text-xs text-muted leading-relaxed">
            Write your own high-performing email copy using variables like {"{{first_name|there}}"} and {"{{company_name}}"}.
          </p>
          <div className="mt-4 text-xs font-semibold text-brand-2">Launch Custom Wizard →</div>
        </Link>
      </div>

      {/* Active Campaigns Table */}
      <div className="glass rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Campaigns</h2>
          <span className="badge border-accent-green/40 text-accent-green">Active Inboxes Rotating</span>
        </div>

        <div className="divide-y divide-border">
          {campaigns.map((c) => (
            <div key={c.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">{c.name}</span>
                  <span className="badge">{c.mode}</span>
                  <span className="badge border-accent-green/40 text-accent-green">{c.status}</span>
                </div>
                <div className="text-xs text-muted mt-1">
                  Dispatched: {c.sent} • Responses: {c.replies}
                </div>
              </div>

              <Link href={`/app/outreach/${c.id}`} className="btn btn-ghost text-xs !py-1.5">
                View Analytics & Recipient Logs
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
