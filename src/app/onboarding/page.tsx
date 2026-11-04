import { requireUser } from "@/server/auth/guards";
import { getSiteBranding } from "@/server/branding";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Onboarding — Lead Reach AI",
  description: "Set up your Lead Reach AI profile and workspace.",
};

export default async function OnboardingPage() {
  const [user, branding] = await Promise.all([
    requireUser({ allowUnonboarded: true }),
    getSiteBranding(),
  ]);

  if (user.onboarded_at) {
    redirect("/app");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <OnboardingWizard
        initialTimezone={user.timezone || "Asia/Dhaka"}
        userEmail={user.email}
        siteBranding={branding}
      />
    </main>
  );
}
