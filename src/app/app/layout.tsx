import Link from "next/link";
import { LayoutDashboard, Home, Settings, Bell, Zap, MessageSquareReply } from "lucide-react";
import { MODULES } from "@/lib/modules";

const nav = [
  { href: "/app", label: "Hub", icon: Home },
  { href: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ...MODULES.map((m) => ({ href: m.href, label: m.title.replace("Social Media Auto Post", "Social Auto Post"), icon: m.icon })),
  { href: "/app/replies", label: "Replies", icon: MessageSquareReply },
  { href: "/app/settings/profile", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="glass hidden w-64 shrink-0 flex-col gap-1 border-r p-4 md:flex" aria-label="Sidebar">
        <Link href="/app" className="mb-6 flex items-center gap-2 px-2 py-1 text-xl font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-2">
            <Zap size={18} />
          </span>
          <span className="gradient-text">AutoHub</span>
        </Link>
        {nav.map((n) => (
          <Link
            key={n.href}
            id={`nav-${n.label.toLowerCase().replace(/\s+/g, "-")}`}
            href={n.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <n.icon size={18} />
            {n.label}
          </Link>
        ))}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <details className="md:hidden">
            <summary className="btn btn-ghost list-none" aria-label="Open menu">☰ Menu</summary>
            <nav className="glass absolute z-20 mt-2 w-60 rounded-2xl p-2">
              {nav.map((n) => (
                <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-surface-2">
                  <n.icon size={16} /> {n.label}
                </Link>
              ))}
            </nav>
          </details>
          <div className="ml-auto flex items-center gap-3">
            <button id="notif-bell" className="btn btn-ghost !p-2.5" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand to-accent-pink font-bold">
              A
            </div>
          </div>
        </header>
        <main className="flex-1 px-6 pb-12">{children}</main>
      </div>
    </div>
  );
}
