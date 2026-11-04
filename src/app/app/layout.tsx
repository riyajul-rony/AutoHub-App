import React from "react";
import Link from "next/link";
import {
  Home,
  LayoutDashboard,
  Share2,
  Search,
  Layers,
  Users,
  Mail,
  Repeat2,
  MessageSquareReply,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { getSessionUser } from "@/server/auth/session";
import { isAdminRole } from "@/server/auth/permissions";
import { SidebarProvider, Sidebar, Topbar, NavSection } from "@/components/ui";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUser();
  const isAdmin = isAdminRole(session?.user?.role);

  const sections: NavSection[] = [
    {
      title: "Workspace",
      items: [
        { id: "hub", label: "Hub", href: "/app", icon: <Home className="w-4 h-4" strokeWidth={1.5} /> },
        { id: "dashboard", label: "Dashboard", href: "/app/dashboard", icon: <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} /> },
      ],
    },
    {
      title: "Automations",
      items: [
        { id: "social", label: "Social Auto Post", href: "/app/social", icon: <Share2 className="w-4 h-4" strokeWidth={1.5} /> },
        {
          id: "leads",
          label: "Lead Generation",
          href: "/app/leads",
          icon: <Search className="w-4 h-4" strokeWidth={1.5} />,
          subItems: [
            { id: "leads-gmaps", label: "Google Maps", href: "/app/leads/google_maps" },
            { id: "leads-meta", label: "Meta Ads Library", href: "/app/leads/meta_ads" },
            { id: "leads-linkedin", label: "LinkedIn (B2B)", href: "/app/leads/linkedin" },
          ],
        },
        { id: "outreach", label: "Cold Outreach", href: "/app/outreach", icon: <Mail className="w-4 h-4" strokeWidth={1.5} /> },
        { id: "followup", label: "Follow-up", href: "/app/followup", icon: <Repeat2 className="w-4 h-4" strokeWidth={1.5} /> },
      ],
    },
    {
      title: "Communications",
      items: [
        { id: "replies", label: "Inbox & Replies", href: "/app/replies", icon: <MessageSquareReply className="w-4 h-4" strokeWidth={1.5} /> },
      ],
    },
    {
      title: "Settings",
      items: [
        { id: "settings", label: "Account Settings", href: "/app/settings/profile", icon: <Settings className="w-4 h-4" strokeWidth={1.5} /> },
      ],
    },
  ];

  if (isAdmin) {
    sections.push({
      title: "Administration",
      items: [
        {
          id: "admin-panel",
          label: "Control Center",
          href: "/admin",
          icon: <Shield className="w-4 h-4 text-accent" strokeWidth={1.5} />,
          badge: "Staff",
        },
      ],
    });
  }

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "U";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-bg text-text">
        {/* Clean 240px Collapsible Sidebar */}
        <Sidebar sections={sections} />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            breadcrumbs={[
              { label: "Lead Reach AI", href: "/app" },
              { label: "Workspace" },
            ]}
            userSlot={
              session?.user ? (
                <UserMenu user={session.user} isAdmin={isAdmin} />
              ) : null
            }
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1200px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
