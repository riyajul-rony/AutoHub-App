import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2 } from "lucide-react";

export default function EmailAccountsPage() {
  const accounts = [
    { email: "sales@mycompany.com", host: "smtp.hostinger.com", status: "active", sentLastHour: "12/25", sentToday: "84/150" },
    { email: "contact@mycompany.com", host: "smtp.hostinger.com", status: "active", sentLastHour: "15/25", sentToday: "92/150" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/outreach" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Outreach
        </Link>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold">Sender Email Accounts</h1>
          <p className="mt-1 text-sm text-muted">
            Connect business SMTP/IMAP or personal Gmail inboxes. Rotated automatically with hard 25/hr cap.
          </p>
        </div>
        <button className="btn btn-primary self-start">
          <Plus size={16} /> Add Email Account
        </button>
      </div>

      <div className="glass rounded-3xl p-6 divide-y divide-border">
        {accounts.map((a, i) => (
          <div key={i} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{a.email}</span>
                <span className="badge border-accent-green/40 text-accent-green flex items-center gap-1">
                  <CheckCircle2 size={12} /> Active
                </span>
              </div>
              <div className="text-xs text-muted mt-1">
                Server: {a.host} • Hourly Usage: {a.sentLastHour} • Today: {a.sentToday}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="btn btn-ghost text-xs !py-1.5">Test SMTP/IMAP</button>
              <button className="btn btn-ghost text-xs !py-1.5 text-danger">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
