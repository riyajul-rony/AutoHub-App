import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { loginAction } from "@/server/auth/actions";

export const metadata = { title: "Log in — AutoHub", description: "Log in to your AutoHub account." };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      subtitle={sp.reset ? "Password updated. Log in with your new password." : "Log in to continue automating."}
      footer={<>New here? <Link href="/signup" className="text-brand-2 hover:underline">Create an account</Link></>}
    >
      <AuthForm
        id="login"
        action={loginAction}
        submitLabel="Log in"
        fields={[
          { name: "email", label: "Email", type: "email", autoComplete: "email", placeholder: "you@company.com" },
          { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
        ]}
      />
      <div className="mt-4 text-right text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-fg">Forgot password?</Link>
      </div>
    </AuthShell>
  );
}
