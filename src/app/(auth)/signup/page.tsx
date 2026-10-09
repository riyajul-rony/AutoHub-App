import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { signupAction } from "@/server/auth/actions";
import { getRegistrationMode } from "@/server/config";
import { db } from "@/server/db";

export const metadata = { title: "Sign up — AutoHub", description: "Create your AutoHub account." };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const invite = (await getRegistrationMode()) === "invite" && (await db.users.count()) > 0;
  return (
    <AuthShell
      title="Create your account"
      subtitle="Social posts, leads and outreach on autopilot."
      footer={<>Already have an account? <Link href="/login" className="text-brand-2 hover:underline">Log in</Link></>}
    >
      <AuthForm
        id="signup"
        action={signupAction}
        submitLabel="Sign up"
        fields={[
          { name: "name", label: "Full name", autoComplete: "name" },
          { name: "email", label: "Email", type: "email", autoComplete: "email" },
          { name: "password", label: "Password (min 8 characters)", type: "password", autoComplete: "new-password" },
          ...(invite ? [{ name: "invite", label: "Invite code", placeholder: "Paste your invite code" }] : []),
        ]}
      />
    </AuthShell>
  );
}
