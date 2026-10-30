import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "404 - Page Not Found — Lead Reach AI",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg text-fg flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md rounded-xl border border-border bg-surface p-8 sm:p-10 shadow-sm space-y-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-bgSubtle border border-border text-muted">
          <FileQuestion size={32} />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted">
            Error 404
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            The page you are looking for doesn&apos;t exist, was renamed, or is temporarily unavailable.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/app/dashboard" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full inline-flex items-center gap-1.5">
              <Home size={14} /> Go to Dashboard
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="secondary" size="sm" className="w-full inline-flex items-center gap-1.5">
              <ArrowLeft size={14} /> Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
