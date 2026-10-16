import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { EmailAccountsManager, EmailAccount } from "./email-accounts-manager";

export const metadata = {
  title: "Sender Inboxes & Accounts — AutoHub",
  description: "Connect business SMTP/IMAP inboxes for automated outreach rotation.",
};

export default async function EmailAccountsPage() {
  const user = await requireUser();

  const accountsRaw = await db.email_accounts.findMany({
    where: { user_id: user.id },
    select: {
      id: true,
      label: true,
      from_name: true,
      from_email: true,
      reply_to: true,
      smtp_host: true,
      smtp_port: true,
      smtp_security: true,
      smtp_username: true,
      imap_host: true,
      imap_port: true,
      imap_security: true,
      hourly_limit: true,
      daily_limit: true,
      status: true,
      last_error: true,
    },
  });

  const initialAccounts: EmailAccount[] = accountsRaw.map((a: any) => ({
    id: a.id,
    label: a.label,
    from_name: a.from_name,
    from_email: a.from_email,
    reply_to: a.reply_to,
    smtp_host: a.smtp_host,
    smtp_port: a.smtp_port,
    smtp_security: a.smtp_security,
    smtp_username: a.smtp_username,
    imap_host: a.imap_host,
    imap_port: a.imap_port,
    imap_security: a.imap_security,
    hourly_limit: a.hourly_limit || 25,
    daily_limit: a.daily_limit || 150,
    status: a.status || "active",
    last_error: a.last_error,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <Link href="/app/outreach" className="hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to Outreach Overview
        </Link>
      </div>

      <EmailAccountsManager initialAccounts={initialAccounts} />
    </div>
  );
}
