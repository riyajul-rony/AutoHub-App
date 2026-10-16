import { requireUser } from "@/server/auth/guards";
import { ProfileForm } from "./profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata = {
  title: "Profile Settings — AutoHub",
  description: "Manage your business profile and sender information.",
};

export default async function ProfileSettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Account Settings"
        description="Manage your business profile, sender address, and timezone."
      />

      <SettingsNav />

      <ProfileForm
        initialValues={{
          name: user.name,
          businessName: (user as any).business_name,
        }}
      />
    </div>
  );
}
