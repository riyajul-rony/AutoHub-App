import Link from "next/link";
import { Shield, Trash2, AlertTriangle } from "lucide-react";
import { requireUser } from "@/server/auth/guards";
import { PasswordForm } from "./password-form";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Security Settings — AutoHub",
  description: "Manage your password, encryption settings, and security audits.",
};

export default async function SecuritySettingsPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Account Settings"
        description="Manage your password, encryption settings, and security audits."
      />

      <SettingsNav />

      <div className="space-y-6">
        {/* Encryption Status Card */}
        <Card>
          <CardContent className="p-5 sm:p-6 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-accent-green text-sm">
              <Shield size={16} /> AES-256-GCM Encryption Active
            </div>
            <p className="text-xs text-muted leading-relaxed">
              All your connected API keys, OpenAI tokens, SMTP credentials, and IMAP passwords are encrypted using hardware-accelerated AES-256-GCM authenticated cipher before hitting disk storage.
            </p>
          </CardContent>
        </Card>

        {/* Change Password Form (Client Component) */}
        <PasswordForm />

        {/* Danger Zone */}
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle size={18} /> Danger Zone
            </CardTitle>
            <CardDescription>
              Request permanent purging of your account, gathered leads, and automation runs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <Link href="/data-deletion">
              <Button variant="danger" size="sm">
                <Trash2 size={14} className="mr-1.5" /> Request Data Deletion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
