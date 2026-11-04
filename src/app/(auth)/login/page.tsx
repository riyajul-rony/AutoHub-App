import React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { loginAction, resendVerificationAction } from "@/server/auth/actions";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export const metadata = {
  title: "Log in — Lead Reach AI",
  description: "Log in to your Lead Reach AI account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string; verified?: string; email?: string; next?: string }>;
}) {
  const sp = await searchParams;

  let bannerError = "";
  if (sp.error === "google_not_configured") {
    bannerError = "Google OAuth is not configured yet. Please log in with email and password.";
  } else if (sp.error === "google_auth_failed") {
    bannerError = "Google sign-in was cancelled or failed. Please try again.";
  } else if (sp.error === "unauthorized") {
    bannerError = "Please log in to access this page.";
  } else if (sp.error === "invite_only") {
    bannerError = "Registration is currently invite-only.";
  }

  const prefilledEmail = sp.email ? decodeURIComponent(sp.email) : "";

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        sp.reset
          ? "Password updated. Log in with your new password."
          : sp.verified === "1"
          ? "Your email is verified. Please log in to continue."
          : "Enter your credentials to access your automation workspace."
      }
      footer={
        <span>
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-text hover:underline">
            Sign up
          </Link>
        </span>
      }
    >
      {sp.verified === "1" && (
        <div className="mb-4 flex items-center gap-2.5 p-3 rounded-[6px] border border-success/30 bg-success-bg text-success text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
          <span>Your email is verified! Please log in to continue.</span>
        </div>
      )}

      {sp.error === "unverified" && (
        <div className="mb-4 rounded-[6px] border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400 font-medium space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" strokeWidth={1.5} />
            <span>Please verify your email address before logging in.</span>
          </div>
          <p className="text-[11px] opacity-90">
            We sent a verification link to {prefilledEmail || "your email"}.
          </p>
          <form
            action={async (formData) => {
              "use server";
              await resendVerificationAction(undefined, formData);
            }}
            className="pt-1"
          >
            <input type="hidden" name="email" value={prefilledEmail} />
            <Button type="submit" variant="secondary" size="sm" className="w-full text-xs">
              Resend Verification Link
            </Button>
          </form>
        </div>
      )}

      {bannerError ? (
        <div className="mb-4 rounded-[6px] border border-danger/30 bg-danger-bg p-2.5 text-xs text-danger font-medium">
          {bannerError}
        </div>
      ) : null}

      <GoogleAuthButton label="Continue with Google" />

      <div className="my-4 flex items-center gap-3 text-[11px] text-text-subtle uppercase">
        <div className="h-px flex-1 bg-border" />
        <span>or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <AuthForm
        id="login"
        action={loginAction}
        submitLabel="Log in"
        hidden={{ next: sp.next || "" }}
        fields={[
          {
            name: "email",
            label: "Work Email",
            type: "email",
            autoComplete: "email",
            placeholder: "you@company.com",
            defaultValue: prefilledEmail,
          },
          {
            name: "password",
            label: "Password",
            type: "password",
            autoComplete: "current-password",
          },
        ]}
      />

      <div className="mt-3 text-right">
        <Link href="/forgot-password" className="text-xs text-text-muted hover:text-text transition-colors">
          Forgot password?
        </Link>
      </div>
    </AuthShell>
  );
}
