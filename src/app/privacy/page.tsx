import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Privacy Policy — AutoHub",
  description: "Privacy Policy and data protection terms for AutoHub automation platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg text-fg py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 sm:p-10 space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> Back to AutoHub
            </Button>
          </Link>
          <span className="text-xs text-muted">Last Updated: October 2026</span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <Shield size={14} /> Legal Compliance
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">Privacy Policy</h1>
          <p className="text-sm text-muted">
            AutoHub is committed to protecting your privacy and handling your data transparently.
          </p>
        </div>

        <div className="space-y-6 text-xs text-muted leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">1. Information We Collect</h2>
            <p>
              When you use AutoHub, we may collect account registration data (name, email, business name), API keys encrypted with AES-256-GCM, connected social accounts (Meta / Facebook / Instagram / LinkedIn authentication tokens), and email credentials (SMTP / IMAP credentials).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">2. Google API Data &amp; Scopes</h2>
            <p>
              AutoHub adheres to the Google API Services User Data Policy, including the Limited Use requirements. When you connect Google Sheets or Google Places, data accessed is used exclusively to export generated leads or query public business information requested by you. We do not sell, rent, or transfer your Google user data to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">3. Meta Platform Data (Facebook &amp; Instagram)</h2>
            <p>
              We access your connected Facebook Pages and Instagram Professional accounts via official Graph APIs solely to publish scheduled content approved by you and retrieve basic engagement metrics. Access tokens are encrypted at rest with AES-256-GCM and never shared.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">4. Email Outreach &amp; Recipient Privacy</h2>
            <p>
              Emails dispatched through AutoHub follow strict anti-spam guidelines, including an enforced hard limit of 25 emails per hour per account, automated random jitter delays, mandatory CAN-SPAM physical sender addresses, and one-click RFC 8058 unsubscribe mechanisms. Recipients who unsubscribe are immediately added to suppression lists and permanently excluded from future campaigns.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">5. Data Retention &amp; Deletion</h2>
            <p>
              You retain full ownership of your data. You may request full account and data deletion at any time by visiting our{" "}
              <Link href="/data-deletion" className="text-brand hover:underline font-medium">
                Data Deletion Instructions
              </Link>{" "}
              or contacting privacy@autohub.app.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
