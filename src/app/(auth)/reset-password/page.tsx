import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { resetPasswordAction } from "@/server/auth/actions";

export const metadata = { title: "Reset password — AutoHub", description: "Choose a new password." };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  return (
    <AuthShell
      title="Choose a new password"
      subtitle="This link works once and expires in 1 hour."
      footer={<Link href="/login" className="text-brand-2 hover:underline">Back to log in</Link>}
    >
      {token ? (
        <AuthForm
          id="reset"
          action={resetPasswordAction}
          submitLabel="Update password"
          hidden={{ token }}
          fields={[{ name: "password", label: "New password (min 8 characters)", type: "password", autoComplete: "new-password" }]}
        />
      ) : (
        <p className="text-sm text-danger">Missing reset token. Request a new link from the forgot-password page.</p>
      )}
    </AuthShell>
  );
}
