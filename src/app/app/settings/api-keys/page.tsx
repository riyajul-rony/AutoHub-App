import { requireUser } from "@/server/auth/guards";
import { db, scoped } from "@/server/db";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import type { SafeApiKey } from "@/server/api-keys/types";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";

export const metadata = {
  title: "API Keys — AutoHub Settings",
  description: "Manage OpenAI API keys for AutoHub automations.",
};

export default async function ApiKeysSettingsPage() {
  const user = await requireUser();

  const rawKeys = await db.api_keys.findMany({
    where: scoped(user.id),
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      provider: true,
      label: true,
      key_last4: true,
      status: true,
      metadata: true,
      last_tested_at: true,
      last_test_ok: true,
      created_at: true,
    },
  });

  const keys: SafeApiKey[] = (rawKeys || []).map((k: any) => ({
    ...k,
    last_tested_at: k.last_tested_at?.toISOString?.() ?? null,
    created_at: k.created_at?.toISOString?.() ?? new Date().toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <PageHeader
        title="API Keys & Services"
        description="Connect your OpenAI API key for automated AI copy and campaign messaging."
      />

      <SettingsNav />

      <ApiKeysManager initialKeys={keys} />
    </div>
  );
}
