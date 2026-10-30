import React from "react";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "@/server/auth/actions";

export const metadata = {
  title: "Forgot password — Lead Reach AI",
  description: "Reset your Lead Reach AI password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your work email address and we'll send a password recovery link."
      footer={
        <Link href="/login" className="font-semibold text-text hover:underline">
          ← Back to log in
        </Link>
      }
    >
      <AuthForm
        id="forgot"
        action={forgotPasswordAction}
        submitLabel="Send recovery link"
        fields={[
          {
            name: "email",
            label: "Work Email",
            type: "email",
            autoComplete: "email",
            placeholder: "you@company.com",
          },
        ]}
      />
    </AuthShell>
  );
}
