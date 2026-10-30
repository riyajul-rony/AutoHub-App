import React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { loginAction } from "@/server/auth/actions";

export const metadata = {
  title: "Log in — Lead Reach AI",
  description: "Log in to your Lead Reach AI account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string; error?: string }>;
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

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        sp.reset
          ? "Password updated. Log in with your new password."
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
        fields={[
          {
            name: "email",
            label: "Work Email",
            type: "email",
            autoComplete: "email",
            placeholder: "you@company.com",
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
