import Link from "next/link";
import { Share2, Globe, Mail } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Integrations — AutoHub",
  description: "View connected social accounts and external API services.",
};

export default async function IntegrationsSettingsPage() {
  const user = await requireUser();
  const userId = user.id;

  const [socialAccounts, emailAccounts] = await Promise.all([
    db.social_accounts.findMany({ where: { user_id: userId } }),
    db.email_accounts.findMany({ where: { user_id: userId } }),
  ]);

  const hasMeta = socialAccounts.some((a: any) => a.provider === "facebook" || a.provider === "instagram");
  const hasLinkedIn = socialAccounts.some((a: any) => a.provider === "linkedin");

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Account Settings"
        description="Manage your connected social platforms, Google accounts, and email relays."
      />

      <SettingsNav />

      <div className="space-y-4">
        {/* Meta */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/10 text-brand shrink-0">
                <Share2 size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-fg">Meta Pages &amp; Instagram</div>
                <div className="text-xs text-muted">Graph API integration for automated social posting.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={hasMeta ? "success" : "neutral"} size="sm">
                {hasMeta ? "Connected" : "Not Connected"}
              </Badge>
              <Link href="/app/social/history">
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                <Globe size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-fg">LinkedIn Organization &amp; Profiles</div>
                <div className="text-xs text-muted">B2B automated article and status publishing.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={hasLinkedIn ? "success" : "neutral"} size="sm">
                {hasLinkedIn ? "Connected" : "Not Connected"}
              </Badge>
              <Link href="/app/social/history">
                <Button variant="ghost" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sender Email Accounts */}
        <Card>
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                <Mail size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-fg">Outreach Sender Accounts (SMTP/IMAP)</div>
                <div className="text-xs text-muted">
                  {emailAccounts.length} inboxes rotating with 25/hr rate-limiting &amp; IMAP poller.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={emailAccounts.length > 0 ? "success" : "neutral"} size="sm">
                {emailAccounts.length} Inboxes
              </Badge>
              <Link href="/app/outreach/email-accounts">
                <Button variant="secondary" size="sm">
                  Manage Inboxes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
