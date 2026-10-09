import { requireUser } from "@/server/auth/guards";
import { db, scoped } from "@/server/db";
import { ApiKeysManager } from "@/components/settings/api-keys-manager";
import type { SafeApiKey } from "@/server/api-keys/types";

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
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">API Keys</h1>
        <p className="mt-1 text-sm text-muted">
          Provide your OpenAI key to enable AI image and post generation.
        </p>
      </div>

      <ApiKeysManager initialKeys={keys} />
    </div>
  );
}
