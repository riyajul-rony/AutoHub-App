import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { signupAction } from "@/server/auth/actions";
import { getRegistrationMode } from "@/server/config";
import { db } from "@/server/db";
import { Button } from "@/components/ui";

export const metadata = {
  title: "Sign up — Lead Reach AI",
  description: "Create your Lead Reach AI account.",
};
export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const [mode, userCount] = await Promise.all([
    getRegistrationMode(),
    db.users.count().catch(() => 0),
  ]);

  const isClosed = mode === "closed" && userCount > 0;
  const isInvite = mode === "invite" && userCount > 0;

  let bannerError = "";
  if (sp.error === "google_not_configured") {
    bannerError = "Google OAuth is not configured yet. Please sign up with email and password.";
  } else if (sp.error === "google_auth_failed") {
    bannerError = "Google sign-up was cancelled or failed. Please try again.";
  } else if (sp.error === "invite_only") {
    bannerError = "Registration is currently invite-only. Ask the admin for an invite code.";
  } else if (sp.error === "registration_closed") {
    bannerError = "New account registration is currently closed by administration.";
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start automating social posts, leads, and outreach."
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-text hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      {bannerError ? (
        <div className="mb-4 rounded-[6px] border border-danger/30 bg-danger-bg p-2.5 text-xs text-danger font-medium">
          {bannerError}
        </div>
      ) : null}

      {isClosed ? (
        <div className="rounded-[6px] border border-border bg-bg-subtle p-5 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-[6px] border border-border bg-surface text-text-subtle flex items-center justify-center">
            <Lock className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text">Registration Closed</h3>
            <p className="text-xs text-text-muted mt-1 leading-normal">
              New account registrations are temporarily closed by platform administration.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/login" className="block w-full">
              <Button variant="primary" size="md" className="w-full">
                Log In to Existing Account
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          <GoogleAuthButton label="Sign up with Google" />

          <div className="my-4 flex items-center gap-3 text-[11px] text-text-subtle uppercase">
            <div className="h-px flex-1 bg-border" />
            <span>or with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <AuthForm
            id="signup"
            action={signupAction}
            submitLabel="Create account"
            fields={[
              { name: "name", label: "Full Name", autoComplete: "name", placeholder: "Alex Vance" },
              { name: "email", label: "Work Email", type: "email", autoComplete: "email", placeholder: "alex@company.com" },
              {
                name: "password",
                label: "Password (min 8 characters)",
                type: "password",
                autoComplete: "new-password",
              },
              ...(isInvite
                ? [{ name: "invite", label: "Invite Code", placeholder: "Paste your invitation token" }]
                : []),
            ]}
          />
        </>
      )}
    </AuthShell>
  );
}
