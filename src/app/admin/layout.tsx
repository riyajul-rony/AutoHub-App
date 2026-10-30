import Link from "next/link";
import { Shield } from "lucide-react";
import { requireAdmin } from "@/server/auth/guards";
import { hasPermission, AdminPermission, ROLE_LABELS } from "@/server/auth/permissions";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminSidebar, AdminNavItem } from "@/components/admin/admin-sidebar";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Admin Panel — AutoHub",
  description: "Global control center for AutoHub automation platform.",
};

interface NavConfigItem {
  href: string;
  label: string;
  icon: string;
  permission?: AdminPermission;
}

const adminNavConfig: NavConfigItem[] = [
  { href: "/admin", label: "Overview & Controls", icon: "Shield" },
  { href: "/admin/users", label: "Users & Tenants", icon: "UserCheck", permission: "users.read" },
  { href: "/admin/plans", label: "Plans & Limits", icon: "Layers", permission: "plans.manage" },
  { href: "/admin/usage", label: "Usage Analytics", icon: "BarChart3", permission: "plans.manage" },
  { href: "/admin/billing", label: "Billing & Revenue", icon: "CreditCard", permission: "billing.manage" },
  { href: "/admin/jobs", label: "Queues & Jobs", icon: "Workflow", permission: "settings.manage" },
  { href: "/admin/logs", label: "System Logs", icon: "ScrollText", permission: "logs.read" },
  { href: "/admin/staff", label: "Staff & Permissions", icon: "Users", permission: "staff.manage" },
  { href: "/admin/apify", label: "Apify Integration", icon: "Cloud", permission: "settings.manage" },
  { href: "/admin/setup", label: "System Setup & Keys", icon: "Settings", permission: "settings.manage" },
  { href: "/admin/health", label: "Health & Services", icon: "Activity" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  // Dynamic menu filtering based on role permissions
  const visibleNav: AdminNavItem[] = adminNavConfig
    .filter((n) => {
      if (!n.permission) return true;
      return hasPermission(admin.role, n.permission);
    })
    .map((n) => ({
      href: n.href,
      label: n.label,
      icon: n.icon,
    }));

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Admin Sidebar */}
      <AdminSidebar
        navItems={visibleNav}
        admin={{
          email: admin.email,
          role: admin.role,
        }}
      />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden md:flex items-center justify-between border-b border-border bg-surface px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 border border-purple-500/20">
              <Shield size={13} /> {ROLE_LABELS[admin.role] || "Staff Access"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/app">
              <Button variant="secondary" size="sm">
                Exit Admin
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
