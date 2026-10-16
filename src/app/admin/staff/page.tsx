import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { STAFF_ROLES } from "@/server/auth/permissions";
import { db } from "@/server/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StaffManager, StaffUser } from "./staff-manager";

export const metadata = {
  title: "Staff & Operator Management — AutoHub Admin",
  description: "Manage team privileges, staff roles, and operator security.",
};

export default async function AdminStaffPage() {
  const currentAdmin = await requirePermission("staff.manage");

  const staffRaw = await db.users.findMany({
    where: {
      role: { in: STAFF_ROLES as any },
    },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
      last_login_at: true,
    },
  });

  const staffList: StaffUser[] = staffRaw.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    created_at: u.created_at,
    last_login_at: u.last_login_at,
  }));

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link href="/admin">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} className="mr-1.5" /> Back to Control Center
          </Button>
        </Link>
        <Badge variant="accent" className="text-[10px]">
          Super Admin Restricted
        </Badge>
      </div>

      <StaffManager initialStaff={staffList} currentUserId={currentAdmin.id} />
    </div>
  );
}
