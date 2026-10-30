import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Terms of Service — Lead Reach AI",
  description: "Terms and conditions governing the use of Lead Reach AI automation tools.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg text-fg py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-xl border border-border bg-surface p-6 sm:p-10 space-y-8 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft size={14} className="mr-1.5" /> Back to Lead Reach AI
            </Button>
          </Link>
          <span className="text-xs text-muted">Last Updated: October 2026</span>
        </div>

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
            <FileText size={14} /> User Agreement
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">Terms of Service</h1>
          <p className="text-sm text-muted">
            Please read these terms carefully before utilizing our social automation, lead extraction, and outreach tools.
          </p>
        </div>

        <div className="space-y-6 text-xs text-muted leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">1. Acceptance of Terms</h2>
            <p>
              By signing up or accessing Lead Reach AI, you agree to comply with and be bound by these Terms of Service, all applicable laws and regulations, and third-party platform terms (including Meta Terms and Google Terms).
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">2. Permitted Use &amp; Anti-Spam Policy</h2>
            <p>
              You agree to use Lead Reach AI strictly for legitimate business growth and communication. Sending unsolicited mass bulk spam, harassing recipients, or attempting to circumvent rate limits is strictly prohibited. You are responsible for ensuring that all cold email outreach complies with the CAN-SPAM Act, GDPR, and other applicable email marketing regulations.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">3. Social Media Content Responsibility</h2>
            <p>
              You maintain full editorial responsibility for all AI-generated content published through connected Facebook, Instagram, and LinkedIn accounts. Lead Reach AI provides automated scheduling and preview queues, but you are responsible for ensuring your posts comply with third-party community standards.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">4. Account Security &amp; Credentials</h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and personal API keys. Lead Reach AI employs AES-256-GCM encryption for all stored tokens and secrets.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-semibold text-fg">5. Limitation of Liability</h2>
            <p>
              Lead Reach AI is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We do not warrant that third-party APIs (Meta, Google, LinkedIn) will remain uninterrupted or error-free.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
