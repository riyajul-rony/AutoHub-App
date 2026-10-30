import React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "@/server/auth/actions";

export const metadata = {
  title: "Reset password — Lead Reach AI",
  description: "Choose a new password.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string | string[] }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const token = typeof sp.token === "string" ? sp.token : "";

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This recovery link is valid for 1 hour."
      footer={
        <Link href="/login" className="font-semibold text-text hover:underline">
          ← Back to log in
        </Link>
      }
    >
      {token ? (
        <AuthForm
          id="reset"
          action={resetPasswordAction}
          submitLabel="Update password"
          hidden={{ token }}
          fields={[
            {
              name: "password",
              label: "New Password (min 8 characters)",
              type: "password",
              autoComplete: "new-password",
            },
          ]}
        />
      ) : (
        <div className="rounded-[6px] border border-danger/30 bg-danger-bg p-3 text-xs text-danger font-medium">
          Missing reset token. Please request a new link from the forgot-password page.
        </div>
      )}
    </AuthShell>
  );
}
