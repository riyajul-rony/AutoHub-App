import { requireUser } from "@/server/auth/guards";
import { OnboardingWizard } from "@/components/onboarding/wizard";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Onboarding — AutoHub",
  description: "Set up your AutoHub profile and workspace.",
};

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true });

  if (user.onboarded_at) {
    redirect("/app");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <OnboardingWizard initialTimezone={user.timezone || "Asia/Dhaka"} userEmail={user.email} />
    </main>
  );
}
