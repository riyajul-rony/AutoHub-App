import Link from "next/link";
import { Wrench, Mail, ShieldAlert, ArrowRight } from "lucide-react";
import { getGlobalPlatformSettings } from "@/server/config";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export const metadata = {
  title: "Under Maintenance — Lead Reach AI",
  description: "Platform is currently undergoing scheduled maintenance.",
};

export default async function MaintenancePage() {
  const settings = await getGlobalPlatformSettings();

  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between max-w-4xl w-full mx-auto relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-primary-text font-bold text-sm">
            ⚡
          </span>
          <span className="font-bold text-lg text-fg tracking-tight">{settings.siteName}</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Notice Card */}
      <main className="max-w-lg w-full mx-auto text-center space-y-6 relative z-10 my-auto py-8">
        <div className="rounded-xl border border-border bg-surface p-8 sm:p-10 shadow-sm space-y-6">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
            <Wrench size={28} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
              <ShieldAlert size={13} /> Scheduled Platform Maintenance
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
              We&apos;ll be back shortly
            </h1>
          </div>

          <p className="text-sm text-muted leading-relaxed max-w-md mx-auto">
            {settings.maintenanceMessage}
          </p>

          <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-4 text-xs">
            <a
              href={`mailto:${settings.supportEmail}`}
              className="inline-flex items-center gap-1.5 text-muted hover:text-fg transition font-medium"
            >
              <Mail size={14} className="text-brand" /> Need help? {settings.supportEmail}
            </a>
          </div>
        </div>

        {/* Staff Access Link */}
        <div className="text-xs text-muted">
          Platform staff or administrator?{" "}
          <Link href="/login" className="text-brand font-semibold hover:underline inline-flex items-center gap-1">
            Staff Sign In <ArrowRight size={12} />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted relative z-10 max-w-4xl w-full mx-auto">
        &copy; {new Date().getFullYear()} {settings.siteName}. All rights reserved.
      </footer>
    </div>
  );
}
