"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Key, Share2, Shield, CreditCard } from "lucide-react";

const SETTINGS_TABS = [
  { label: "Profile", href: "/app/settings/profile", icon: User },
  { label: "API Keys", href: "/app/settings/api-keys", icon: Key },
  { label: "Integrations", href: "/app/settings/integrations", icon: Share2 },
  { label: "Security", href: "/app/settings/security", icon: Shield },
  { label: "Plan & Limits", href: "/app/settings/billing", icon: CreditCard },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 border-b border-border pb-3 overflow-x-auto scrollbar-none">
      {SETTINGS_TABS.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              isActive
                ? "bg-bgSubtle text-fg font-semibold border border-border"
                : "text-muted hover:text-fg hover:bg-surfaceHover"
            }`}
          >
            <Icon size={14} className={isActive ? "text-brand" : "text-muted"} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
