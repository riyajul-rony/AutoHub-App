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
  title: "Integrations — Lead Reach AI",
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
        <Card className="hover:border-borderStrong transition-colors duration-150">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-[8px] bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/20 shrink-0">
                <Share2 size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-fg">Meta Pages &amp; Instagram</div>
                <div className="text-xs text-muted">Graph API integration for automated social posting.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={hasMeta ? "success" : "warning"} size="sm" dot>
                {hasMeta ? "Connected" : "Not Connected"}
              </Badge>
              <Link href="/app/social">
                <Button variant="secondary" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* LinkedIn */}
        <Card className="hover:border-borderStrong transition-colors duration-150">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-[8px] bg-[#0A66C2]/10 text-[#0A66C2] border border-[#0A66C2]/20 shrink-0">
                <Globe size={20} />
              </div>
              <div>
                <div className="font-semibold text-sm text-fg">LinkedIn Organization &amp; Profiles</div>
                <div className="text-xs text-muted">B2B automated article and status publishing.</div>
              </div>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-center">
              <Badge variant={hasLinkedIn ? "success" : "warning"} size="sm" dot>
                {hasLinkedIn ? "Connected" : "Not Connected"}
              </Badge>
              <Link href="/app/social">
                <Button variant="secondary" size="sm">
                  Manage
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Sender Email Accounts */}
        <Card className="hover:border-borderStrong transition-colors duration-150">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 flex items-center justify-center rounded-[8px] bg-[var(--brand-emerald-subtle)] text-[var(--badge-success-text)] border border-[var(--brand-emerald-border)] shrink-0">
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
              <Badge variant={emailAccounts.length > 0 ? "success" : "warning"} size="sm" dot>
                {emailAccounts.length > 0 ? `${emailAccounts.length} Active` : "Not Connected"}
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
