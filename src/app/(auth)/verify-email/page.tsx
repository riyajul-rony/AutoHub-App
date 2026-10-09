import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { resendVerificationAction } from "@/server/auth/actions";
import { db } from "@/server/db";
import { sha256 } from "@/server/auth/token";
import { getSessionUser } from "@/server/auth/session";
import { CheckCircle2, AlertCircle } from "lucide-react";

export const metadata = { title: "Verify email — AutoHub", description: "Verify your email address." };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; sent?: string; email?: string }>;
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
      title={verified ? "Email verified!" : "Check your inbox"}
      subtitle={
        verified
          ? "Your email has been successfully verified."
          : `We sent a verification link to ${sp.email ? decodeURIComponent(sp.email) : "your email address"}.`
      }
      footer={
        verified ? (
          <Link href="/onboarding" className="text-brand-2 hover:underline">
            Proceed to onboarding →
          </Link>
        ) : (
          <Link href="/login" className="text-brand-2 hover:underline">
            Back to login
          </Link>
        )
      }
    >
      {verified ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent-green/20 text-accent-green">
            <CheckCircle2 size={28} />
          </div>
          <p className="text-sm text-muted">
            You can now access your AutoHub dashboard and set up automations.
          </p>
          <Link href="/onboarding" className="btn btn-primary w-full">
            Continue to onboarding
          </Link>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-danger/20 text-danger">
            <AlertCircle size={28} />
          </div>
          <p className="text-sm text-danger">{errorMsg}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Click the link in the email to activate your account. If you didn&apos;t receive it, check your spam folder or request a new one below.
          </p>
          {session && (
            <form action={async () => {
              "use server";
              await resendVerificationAction();
            }}>
              <button className="btn btn-ghost w-full">Resend verification email</button>
            </form>
          )}
        </div>
      )}
    </AuthShell>
  );
}
