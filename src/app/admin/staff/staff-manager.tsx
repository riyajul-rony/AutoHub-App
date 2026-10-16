"use client";

import React, { useState } from "react";
import { UserPlus, Shield, UserCheck, UserX, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { StaffRole, STAFF_ROLES, ROLE_LABELS } from "@/server/auth/permissions";
import { DataTable, Column } from "@/components/admin/data-table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  inviteStaffAction,
  updateStaffRoleAction,
  toggleStaffStatusAction,
} from "@/server/admin/staff-actions";

export interface StaffUser {
  id: string;
  name?: string | null;
  email: string;
  role: string;
  status: string;
  created_at: string | Date;
  last_login_at?: string | Date | null;
}

interface StaffManagerProps {
  initialStaff: StaffUser[];
  currentUserId: string;
}

export function StaffManager({ initialStaff, currentUserId }: StaffManagerProps) {
  const [staffList, setStaffList] = useState<StaffUser[]>(initialStaff);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("support");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    variant: "danger" | "warning";
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    variant: "danger",
    onConfirm: async () => {},
  });

  const superAdminCount = staffList.filter((s) => s.role === "super_admin" && s.status === "active").length;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await inviteStaffAction({
      email: inviteEmail,
      role: inviteRole,
      name: inviteName,
    });

    setIsSubmitting(false);

    if (res.error) {
      setFeedback({ type: "error", message: res.error });
    } else {
      setFeedback({ type: "success", message: res.message || "Invitation processed successfully!" });
      setIsInviteOpen(false);
      setInviteEmail("");
      setInviteName("");
      // Add or update locally
      setStaffList((prev) => {
        const existingIdx = prev.findIndex((s) => s.email.toLowerCase() === inviteEmail.toLowerCase());
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = { ...updated[existingIdx], role: inviteRole, status: "active" };
          return updated;
        }
        return [
          {
            id: `temp_${Date.now()}`,
            email: inviteEmail,
            name: inviteName || inviteEmail.split("@")[0],
            role: inviteRole,
            status: "active",
            created_at: new Date(),
          },
          ...prev,
        ];
      });
    }
  };

  const promptRoleChange = (user: StaffUser, newRole: StaffRole) => {
    if (user.role === newRole) return;

    setConfirmDialog({
      isOpen: true,
      title: `Change Staff Role to ${ROLE_LABELS[newRole]}`,
      message: `Are you sure you want to change permissions for ${user.email} from ${ROLE_LABELS[user.role]} to ${ROLE_LABELS[newRole]}? Their current sessions will be immediately invalidated to enforce new permissions.`,
      confirmText: "Update Role",
      variant: "warning",
      onConfirm: async () => {
        setIsSubmitting(true);
        const res = await updateStaffRoleAction(user.id, newRole);
        setIsSubmitting(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (res.error) {
          setFeedback({ type: "error", message: res.error });
        } else {
          setFeedback({ type: "success", message: res.message || "Role updated successfully." });
          setStaffList((prev) =>
            prev.map((s) => (s.id === user.id ? { ...s, role: newRole } : s))
          );
        }
      },
    });
  };

  const promptStatusToggle = (user: StaffUser) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    const isSuspending = newStatus === "suspended";

    setConfirmDialog({
      isOpen: true,
      title: isSuspending ? "Suspend Staff Access" : "Reactivate Staff Access",
      message: isSuspending
        ? `Are you sure you want to suspend ${user.email}? They will be immediately evicted and locked out of all administrative tools.`
        : `Reactivate administrative access for ${user.email}?`,
      confirmText: isSuspending ? "Suspend Staff" : "Reactivate",
      variant: isSuspending ? "danger" : "warning",
      onConfirm: async () => {
        setIsSubmitting(true);
        const res = await toggleStaffStatusAction(user.id, newStatus);
        setIsSubmitting(false);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

        if (res.error) {
          setFeedback({ type: "error", message: res.error });
        } else {
          setFeedback({ type: "success", message: res.message || "Status updated." });
          setStaffList((prev) =>
            prev.map((s) => (s.id === user.id ? { ...s, status: newStatus } : s))
          );
        }
      },
    });
  };

  const columns: Column<StaffUser>[] = [
    {
      header: "Staff Member",
      accessor: "name",
      sortable: true,
      render: (u) => (
        <div>
          <div className="font-semibold text-fg flex items-center gap-1.5">
            <span>{u.name || "Staff Member"}</span>
            {u.id === currentUserId && (
              <Badge variant="accent" className="text-[10px]">
                You
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-muted font-mono">{u.email}</div>
        </div>
      ),
    },
    {
      header: "Role & Level",
      accessor: "role",
      sortable: true,
      render: (u) => <StatusBadge role={u.role} />,
    },
    {
      header: "Account Status",
      accessor: "status",
      sortable: true,
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      header: "Last Login",
      accessor: "last_login_at",
      sortable: true,
      render: (u) => (
        <span className="text-[11px] text-muted font-mono">
          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      header: "Actions",
      className: "text-right",
      render: (u) => {
        const isSelf = u.id === currentUserId;
        const isSoleSuperAdmin = u.role === "super_admin" && superAdminCount <= 1;

        return (
          <div className="flex items-center justify-end gap-2">
            {/* Role Selector Dropdown */}
            <select
              value={u.role}
              disabled={isSelf || (isSoleSuperAdmin && u.role === "super_admin")}
              onChange={(e) => promptRoleChange(u, e.target.value as StaffRole)}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand disabled:opacity-40"
              title={
                isSelf
                  ? "You cannot change your own role"
                  : isSoleSuperAdmin
                  ? "Cannot demote the last Super Admin"
                  : "Change Role"
              }
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>

            {/* Suspend / Activate Toggle */}
            <Button
              type="button"
              disabled={isSelf || (isSoleSuperAdmin && u.status === "active")}
              onClick={() => promptStatusToggle(u)}
              variant={u.status === "active" ? "danger" : "secondary"}
              size="sm"
              className="text-xs !py-1 !px-2.5 disabled:opacity-30 inline-flex items-center gap-1"
              title={
                isSelf
                  ? "You cannot suspend your own account"
                  : isSoleSuperAdmin
                  ? "Cannot deactivate the last Super Admin"
                  : u.status === "active"
                  ? "Suspend Staff"
                  : "Activate Staff"
              }
            >
              {u.status === "active" ? <UserX size={13} /> : <UserCheck size={13} />}
              <span>{u.status === "active" ? "Suspend" : "Activate"}</span>
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Invite Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-fg">
            <Shield className="text-purple-600 dark:text-purple-400" size={20} /> Active Staff Directory
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Assign team privileges, invite operators, and manage role-based platform access.
          </p>
        </div>

        <Button
          onClick={() => {
            setFeedback(null);
            setIsInviteOpen(true);
          }}
          variant="primary"
          size="sm"
          className="inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <UserPlus size={15} /> Invite Staff Member
        </Button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300"
          }`}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Staff Table */}
      <DataTable
        columns={columns}
        data={staffList}
        searchPlaceholder="Search staff by name or email..."
        searchFields={["name", "email"]}
        filters={[
          {
            label: "Roles",
            key: "role",
            options: STAFF_ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
          },
          {
            label: "Statuses",
            key: "status",
            options: [
              { label: "Active", value: "active" },
              { label: "Suspended", value: "suspended" },
            ],
          },
        ]}
        pageSize={10}
        emptyTitle="No staff members found"
        emptyDescription="No staff accounts match your current search query."
      />

      {/* Invite Modal */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  <UserPlus size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-fg">Invite Staff Member</h3>
                  <p className="text-[11px] text-muted">Grant admin privileges via email address.</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-muted hover:text-fg p-1 rounded-lg hover:bg-bgSubtle transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Email Address <span className="text-brand">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="operator@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs font-mono text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Full Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Tariq Ahmed"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Administrative Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                >
                  <option value="support">Support Specialist (Read-only users &amp; logs)</option>
                  <option value="finance">Finance Manager (Billing &amp; subscription plans)</option>
                  <option value="admin">Admin (Full operations except staff management)</option>
                  <option value="super_admin">Super Admin (All privileges including staff)</option>
                </select>
              </div>

              <div className="p-3 rounded-lg bg-bgSubtle border border-border text-[11px] text-muted space-y-1">
                <div className="font-semibold text-fg flex items-center gap-1.5">
                  <KeyRound size={13} className="text-purple-600 dark:text-purple-400" /> Instant Access Provisioning
                </div>
                <p>
                  If this email already belongs to a registered user, their account is instantly upgraded. Otherwise, a new account is provisioned.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting || !inviteEmail}
                >
                  {isSubmitting ? "Inviting..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        variant={confirmDialog.variant}
        isLoading={isSubmitting}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
