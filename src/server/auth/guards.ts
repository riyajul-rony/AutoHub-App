import { redirect } from "next/navigation";
import { getSessionUser } from "./session";
import { AdminPermission, hasPermission, isAdminRole } from "./permissions";
import { getMaintenanceMode } from "@/server/config";

/** Require a logged-in, verified, onboarded user. Redirects otherwise. */
export async function requireUser(opts: { allowUnonboarded?: boolean; bypassMaintenance?: boolean } = {}) {
  const s = await getSessionUser();
  if (!s) redirect("/login");
  const { user } = s;

  // Intercept non-admin users if platform is under maintenance
  if (!opts.bypassMaintenance && !isAdminRole(user.role)) {
    const maint = await getMaintenanceMode();
    if (maint.active) {
      redirect("/maintenance");
    }
  }

  if (!user.email_verified_at) redirect("/verify-email");
  if (!opts.allowUnonboarded && !user.onboarded_at) redirect("/onboarding");
  return user;
}

/** Require any staff or admin role. Redirects to /app if unauthorized. */
export async function requireAdmin() {
  const user = await requireUser();
  if (!isAdminRole(user.role)) redirect("/app");
  return user;
}

/** Require a specific permission for admin pages. Redirects to /admin if missing. */
export async function requirePermission(permission: AdminPermission) {
  const user = await requireAdmin();
  if (!hasPermission(user.role, permission)) {
    redirect("/admin");
  }
  return user;
}

/** Assert permission for API routes and Server Actions. Throws an error if missing. */
export function assertPermission(role?: string | null, permission?: AdminPermission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: missing required permission [${permission}]`);
  }
}
