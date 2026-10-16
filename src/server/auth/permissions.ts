export type AdminPermission =
  | "users.read"
  | "users.manage"
  | "plans.manage"
  | "billing.manage"
  | "settings.manage"
  | "logs.read"
  | "staff.manage";

export type StaffRole = "super_admin" | "admin" | "support" | "finance";

export const STAFF_ROLES: StaffRole[] = ["super_admin", "admin", "support", "finance"];

export const ALL_PERMISSIONS: AdminPermission[] = [
  "users.read",
  "users.manage",
  "plans.manage",
  "billing.manage",
  "settings.manage",
  "logs.read",
  "staff.manage",
];

export const ROLE_PERMISSIONS: Record<StaffRole, AdminPermission[]> = {
  super_admin: [
    "users.read",
    "users.manage",
    "plans.manage",
    "billing.manage",
    "settings.manage",
    "logs.read",
    "staff.manage",
  ],
  admin: [
    "users.read",
    "users.manage",
    "plans.manage",
    "billing.manage",
    "settings.manage",
    "logs.read",
  ],
  support: [
    "users.read",
    "logs.read",
  ],
  finance: [
    "billing.manage",
    "plans.manage",
    "logs.read",
  ],
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  support: "Support Specialist",
  finance: "Finance Manager",
  user: "Standard User",
};

/**
 * Check if a role is a staff/admin role that can access the admin area.
 */
export function isAdminRole(role?: string | null): boolean {
  if (!role) return false;
  return STAFF_ROLES.includes(role as StaffRole);
}

/**
 * Check if a given role has a specific permission.
 */
export function hasPermission(role?: string | null, permission?: AdminPermission): boolean {
  if (!role || !permission) return false;
  if (!isAdminRole(role)) return false;

  const permissions = ROLE_PERMISSIONS[role as StaffRole];
  return !!permissions?.includes(permission);
}

/**
 * Retrieve all granted permissions for a role.
 */
export function getRolePermissions(role?: string | null): AdminPermission[] {
  if (!role || !isAdminRole(role)) return [];
  return ROLE_PERMISSIONS[role as StaffRole] || [];
}
