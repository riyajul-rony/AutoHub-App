import Link from "next/link";

export const metadata = {
  title: "Profile Settings — AutoHub",
  description: "Manage your profile, business details, timezone, and legal email address.",
};

const tabs = [
  { label: "Profile", href: "/app/settings/profile", active: true },
  { label: "API Keys", href: "/app/settings/api-keys", active: false },
  { label: "Integrations", href: "/app/settings/integrations", active: false },
  { label: "Security", href: "/app/settings/security", active: false },
];

export default function ProfileSettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Account Settings</h1>
        <p className="mt-1 text-sm text-muted">Manage your business profile, sender address, and timezone.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition ${
              t.active ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="glass rounded-3xl p-8 space-y-6">
        <h2 className="text-lg font-bold">Business & Legal Information</h2>
        <p className="text-xs text-muted">
          Your sender legal name and physical address are required by CAN-SPAM regulations and will appear in email footers.
        </p>

        <form className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" defaultValue="Riyajul Islam Rony" />
            </div>
            <div>
              <label className="label">Business Name</label>
              <input type="text" className="input" defaultValue="AutoHub Studio" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Timezone (IANA)</label>
              <input type="text" className="input" defaultValue="Asia/Dhaka" />
            </div>
            <div>
              <label className="label">Sender Legal Name</label>
              <input type="text" className="input" defaultValue="AutoHub Studio Ltd." />
            </div>
          </div>

          <div>
            <label className="label">Sender Physical Address</label>
            <input type="text" className="input" defaultValue="Road 11, Banani, Dhaka-1213, Bangladesh" />
          </div>

          <div className="pt-4 flex justify-end">
            <button type="button" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
