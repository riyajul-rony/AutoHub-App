import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { forgotPasswordAction } from "@/server/auth/actions";

export const metadata = { title: "Forgot password — AutoHub", description: "Reset your AutoHub password." };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your email and we'll send a reset link."
      footer={<Link href="/login" className="text-brand-2 hover:underline">Back to log in</Link>}
    >
      <AuthForm
        id="forgot"
        action={forgotPasswordAction}
        submitLabel="Send reset link"
        fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
      />
    </AuthShell>
  );
}
