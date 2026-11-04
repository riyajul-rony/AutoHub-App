import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { resendVerificationAction } from "@/server/auth/actions";
import { AlertCircle } from "lucide-react";
import { Button, Input } from "@/components/ui";

export const metadata = {
  title: "Verify email — Lead Reach AI",
  description: "Verify your email address.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{
    token?: string;
    sent?: string;
    email?: string;
    delivery_error?: string;
    error?: string;
  }>;
}) {
  const sp = await searchParams;

  // If a token is provided in URL, route through the Route Handler to securely set session cookie and redirect
  if (sp.token) {
    redirect(`/api/v1/auth/verify?token=${encodeURIComponent(sp.token)}`);
  }

  let errorMessage = "";
  if (sp.error === "expired") {
    errorMessage = "Your verification link has expired. Request a new link below.";
  } else if (sp.error === "used") {
    errorMessage = "This verification link has already been used. Please log in to continue.";
  } else if (sp.error === "invalid_token") {
    errorMessage = "The verification link is invalid or incomplete.";
  } else if (sp.error === "server_error") {
    errorMessage = "A server error occurred during verification. Please request a new link.";
  }

  const emailParam = sp.email ? decodeURIComponent(sp.email) : "";

  return (
    <AuthShell
      title="Check your inbox"
      subtitle={
        errorMessage
          ? errorMessage
          : `We sent a verification link to ${
              emailParam ? emailParam : "your email address"
            }.`
      }
      footer={
        <Link href="/login" className="font-semibold text-text hover:underline">
          Back to log in →
        </Link>
      }
    >
      <div className="space-y-4 text-xs">
        {errorMessage ? (
          <div className="flex items-center gap-2.5 p-3 rounded-[6px] border border-danger/30 bg-danger-bg text-danger text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMessage}</span>
          </div>
        ) : sp.delivery_error ? (
          <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
            <div className="space-y-1">
              <p className="font-semibold">Email Delivery Issue</p>
              <p className="text-[11px] opacity-90">{decodeURIComponent(sp.delivery_error)}</p>
            </div>
          </div>
        ) : (
          <p className="text-text-muted leading-normal">
            Click the link in the email to activate your account and proceed to workspace setup. If you don&apos;t see it within a few minutes, check your spam folder.
          </p>
        )}

        {sp.sent && (
          <div className="p-2.5 rounded-[6px] border border-success/30 bg-success-bg text-center text-xs text-success font-medium">
            A new verification link was dispatched to your email!
          </div>
        )}

        <form
          action={async (formData) => {
            "use server";
            await resendVerificationAction(undefined, formData);
          }}
          className="space-y-3 pt-2"
        >
          {emailParam ? (
            <input type="hidden" name="email" value={emailParam} />
          ) : (
            <Input
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@company.com"
              required
            />
          )}

          <Button type="submit" variant="secondary" size="md" className="w-full">
            Resend Verification Link
          </Button>
        </form>

        <div className="pt-2 text-center">
          <Link
            href={emailParam ? `/login?email=${encodeURIComponent(emailParam)}` : "/login"}
            className="text-xs text-text-muted hover:text-text transition-colors"
          >
            Already verified? <span className="font-semibold underline">Log in here</span>
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
