import Link from "next/link";
import { Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "User Data Deletion — Lead Reach AI",
  description: "Instructions and request form for deleting your data from Lead Reach AI.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-bg text-fg py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 sm:p-10 space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Lead Reach AI
            </Button>
          </Link>
          <span className="text-xs text-muted">Meta Platform Compliant</span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
            <Trash2 size={14} /> Data Rights
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">User Data Deletion Instructions</h1>
          <p className="text-sm text-muted">
            In accordance with Meta Platform Terms and GDPR, you have the right to request deletion of your account and associated social connection tokens.
          </p>
        </div>

        <div className="space-y-6 text-xs text-muted leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">How to delete your data from Facebook / Meta Settings:</h2>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Log into your Facebook account and go to <strong>Settings &amp; Privacy &gt; Settings</strong>.</li>
              <li>Navigate to <strong>Apps and Websites</strong> to see all apps connected to your account.</li>
              <li>Locate <strong>Lead Reach AI</strong> and click <strong>Remove</strong>.</li>
              <li>Check the box to delete all posts, videos, or events that Lead Reach AI published on your behalf, and confirm removal.</li>
            </ol>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">How to request full deletion from Lead Reach AI directly:</h2>
            <p>
              If you wish to delete your entire Lead Reach AI workspace, gathered leads, campaign history, and encrypted credentials:
            </p>
            <div className="p-4 rounded-lg bg-bgSubtle border border-border space-y-2">
              <div className="font-semibold text-fg">Direct Deletion Request</div>
              <p>
                Send an email from your registered account to <strong className="text-brand">privacy@leadreachai.cerkitlabs.tech</strong> with the subject line <em>&quot;Request for Data Deletion&quot;</em>. All records, leads, and tokens are permanently purged within 48 hours.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
