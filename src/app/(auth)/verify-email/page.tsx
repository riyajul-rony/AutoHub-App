import React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { resendVerificationAction } from "@/server/auth/actions";
import { db } from "@/server/db";
import { sha256 } from "@/server/auth/token";
import { getSessionUser } from "@/server/auth/session";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";

export const metadata = {
  title: "Verify email — Lead Reach AI",
  description: "Verify your email address.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string; email?: string; delivery_error?: string }>;
}) {
  const sp = await searchParams;
  const token = sp.token;
  let verified = false;
  let errorMsg = "";

  if (token) {
    const hashed = sha256(token);
    const rec = await db.verification_tokens.findUnique({
      where: { token_hash: hashed },
    });

    if (rec && rec.purpose === "verify_email" && !rec.used_at && rec.expires_at > new Date()) {
      await db.$transaction([
        db.users.update({
          where: { email: rec.identifier },
          data: { email_verified_at: new Date() },
        }),
        db.verification_tokens.update({
          where: { id: rec.id },
          data: { used_at: new Date() },
        }),
      ]);
      verified = true;
    } else {
      errorMsg = "Verification link is invalid or has expired.";
    }
  }

  const session = await getSessionUser();

  return (
    <AuthShell
      title={verified ? "Email verified" : "Check your inbox"}
      subtitle={
        verified
          ? "Your email address has been successfully verified."
          : `We sent a verification link to ${
              sp.email ? decodeURIComponent(sp.email) : "your email address"
            }.`
      }
      footer={
        verified ? (
          <Link href="/onboarding" className="font-semibold text-text hover:underline">
            Proceed to workspace setup →
          </Link>
        ) : (
          <Link href="/login" className="font-semibold text-text hover:underline">
            Back to log in
          </Link>
        )
      }
    >
      {verified ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 p-3 rounded-[6px] border border-success/30 bg-success-bg text-success text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>Account verified! You can now complete your onboarding.</span>
          </div>

          <Link href="/onboarding" className="block w-full">
            <Button variant="primary" size="md" className="w-full">
              Continue to Onboarding
            </Button>
          </Link>
        </div>
      ) : errorMsg ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 p-3 rounded-[6px] border border-danger/30 bg-danger-bg text-danger text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span>{errorMsg}</span>
          </div>

          <Link href="/login" className="block w-full">
            <Button variant="secondary" size="md" className="w-full">
              Back to Login
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 text-xs">
          {sp.delivery_error ? (
            <div className="flex items-start gap-2.5 p-3 rounded-[6px] border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div className="space-y-1">
                <p className="font-semibold">Email Delivery Issue</p>
                <p className="text-[11px] opacity-90">{decodeURIComponent(sp.delivery_error)}</p>
              </div>
            </div>
          ) : (
            <p className="text-text-muted leading-normal">
              Click the link in the email to activate your account. If you don&apos;t see it within a few minutes, check your spam folder.
            </p>
          )}

          <form
            action={async (formData) => {
              "use server";
              await resendVerificationAction(undefined, formData);
            }}
            className="pt-2"
          >
            {sp.email && <input type="hidden" name="email" value={sp.email} />}
            <Button type="submit" variant="secondary" size="md" className="w-full">
              Resend verification email
            </Button>
          </form>

          {sp.sent && (
            <p className="text-center text-xs text-success font-medium">
              A verification link was dispatched to your email.
            </p>
          )}
        </div>
      )}
    </AuthShell>
  );
}
