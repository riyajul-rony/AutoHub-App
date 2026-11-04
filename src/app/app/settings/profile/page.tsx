import { requireUser } from "@/server/auth/guards";
import { db } from "@/server/db";
import { ProfileForm } from "./profile-form";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata = {
  title: "Profile Settings — Lead Reach AI",
  description: "Manage your business profile, avatar, and sender information.",
};

export default async function ProfileSettingsPage() {
  const user = await requireUser();

  const dbUser = await db.users.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      name: true,
      business_name: true,
      timezone: true,
      sender_legal_name: true,
      sender_address: true,
      avatar_url: true,
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="Account Settings"
        description="Manage your business profile, avatar, sender address, and timezone."
      />

      <SettingsNav />

      <ProfileForm
        initialValues={{
          name: dbUser?.name ?? user.name,
          businessName: dbUser?.business_name ?? (user as any).business_name,
          timezone: dbUser?.timezone ?? "UTC",
          senderLegalName: dbUser?.sender_legal_name ?? "",
          senderAddress: dbUser?.sender_address ?? "",
          avatarUrl: dbUser?.avatar_url ?? null,
          email: dbUser?.email ?? user.email,
        }}
      />
    </div>
  );
}
