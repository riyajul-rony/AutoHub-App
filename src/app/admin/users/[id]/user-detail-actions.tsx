"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  UserX,
  Shield,
  Key,
  MailCheck,
  LogOut,
  Trash2,
  Sliders,
  X,
  CreditCard,
} from "lucide-react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  suspendUserAction,
  activateUserAction,
  updateUserRoleAction,
  updateUserPlanAction,
  verifyUserEmailAction,
  sendPasswordResetAction,
  revokeAllSessionsAction,
  softDeleteUserAction,
} from "@/server/admin/user-actions";
import { updateUserLimitOverridesAction } from "@/server/admin/plan-actions";

export interface PlanOption {
  id: string;
  slug: string;
  name: string;
}

export interface UserOverridesData {
  monthly_leads?: number | null;
  monthly_social_posts?: number | null;
  monthly_outreach_emails?: number | null;
  max_social_accounts?: number | null;
  max_email_accounts?: number | null;
  max_campaigns?: number | null;
}

interface UserDetailActionsProps {
  userId: string;
  userEmail: string;
  currentRole: string;
  currentStatus: string;
  currentPlan: string;
  isEmailVerified: boolean;
  isCurrentAdmin: boolean;
  availablePlans?: PlanOption[];
  initialOverrides?: UserOverridesData | null;
}

export function UserDetailActions({
  userId,
  userEmail,
  currentRole,
  currentStatus,
  currentPlan,
  isEmailVerified,
  isCurrentAdmin,
  availablePlans = [],
  initialOverrides,
}: UserDetailActionsProps) {
  const router = useRouter();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dialog triggers
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showOverridesModal, setShowOverridesModal] = useState(false);

  // Quick inputs
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);

  // Overrides form state
  const [overrideLeads, setOverrideLeads] = useState(initialOverrides?.monthly_leads != null ? String(initialOverrides.monthly_leads) : "");
  const [overrideSocialPosts, setOverrideSocialPosts] = useState(initialOverrides?.monthly_social_posts != null ? String(initialOverrides.monthly_social_posts) : "");
  const [overrideOutreachEmails, setOverrideOutreachEmails] = useState(initialOverrides?.monthly_outreach_emails != null ? String(initialOverrides.monthly_outreach_emails) : "");
  const [overrideSocialAccounts, setOverrideSocialAccounts] = useState(initialOverrides?.max_social_accounts != null ? String(initialOverrides.max_social_accounts) : "");
  const [overrideEmailAccounts, setOverrideEmailAccounts] = useState(initialOverrides?.max_email_accounts != null ? String(initialOverrides.max_email_accounts) : "");
  const [overrideCampaigns, setOverrideCampaigns] = useState(initialOverrides?.max_campaigns != null ? String(initialOverrides.max_campaigns) : "");

  async function executeAction(
    actionName: string,
    actionFn: () => Promise<{ success?: boolean; ok?: boolean; error?: string; message?: string }>
  ) {
    setLoadingAction(actionName);
    setFeedback(null);
    try {
      const res = await actionFn();
      const isOk = res.success !== undefined ? res.success : res.ok !== undefined ? res.ok : true;
      if (!isOk) {
        throw new Error(res.error || res.message || "Action failed");
      }
      setFeedback({ type: "success", text: res.message || "Action executed successfully!" });
      router.refresh();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "An error occurred" });
    } finally {
      setLoadingAction(null);
    }
  }

  async function handleRoleChange(newRole: string) {
    if (newRole === currentRole) return;
    setSelectedRole(newRole);
    await executeAction("role", () => updateUserRoleAction(userId, newRole));
  }

  async function handlePlanChange(newPlan: string) {
    if (newPlan === currentPlan) return;
    setSelectedPlan(newPlan);
    await executeAction("plan", () => updateUserPlanAction(userId, newPlan));
  }

  async function handleSaveOverrides(e: React.FormEvent) {
    e.preventDefault();
    setLoadingAction("overrides");
    setFeedback(null);

    const parseNum = (val: string) => {
      const trimmed = val.trim();
      return trimmed === "" ? null : Math.max(0, parseInt(trimmed, 10));
    };

    try {
      const payload: UserOverridesData = {
        monthly_leads: parseNum(overrideLeads),
        monthly_social_posts: parseNum(overrideSocialPosts),
        monthly_outreach_emails: parseNum(overrideOutreachEmails),
        max_social_accounts: parseNum(overrideSocialAccounts),
        max_email_accounts: parseNum(overrideEmailAccounts),
        max_campaigns: parseNum(overrideCampaigns),
      };

      const res = await updateUserLimitOverridesAction(userId, payload);
      if (!res.ok) {
        throw new Error(res.message || "Failed to save overrides");
      }
      setShowOverridesModal(false);
      setFeedback({ type: "success", text: "Custom resource overrides updated!" });
      router.refresh();
    } catch (err: unknown) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Error saving overrides" });
    } finally {
      setLoadingAction(null);
    }
  }

  const planOptions =
    availablePlans.length > 0
      ? availablePlans
      : [
          { id: "free", slug: "free", name: "Free Tier" },
          { id: "starter", slug: "starter", name: "Starter Plan" },
          { id: "pro", slug: "pro", name: "Pro Plan" },
          { id: "enterprise", slug: "enterprise", name: "Enterprise Tier" },
        ];

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`rounded-lg p-3 text-xs flex items-center justify-between border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
          }`}
        >
          <span>{feedback.text}</span>
          <button onClick={() => setFeedback(null)} className="ml-2 font-bold hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {/* Primary Action Buttons Bar */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <Shield size={14} className="text-brand" /> Administrative Controls &amp; Actions
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            {/* Suspend / Activate Button */}
            {currentStatus === "active" ? (
              <Button
                variant="secondary"
                size="sm"
                id="user-suspend-btn"
                disabled={isCurrentAdmin || loadingAction === "suspend"}
                onClick={() => setShowSuspendDialog(true)}
                title={isCurrentAdmin ? "You cannot suspend yourself" : "Suspend user and pause campaigns"}
                className="text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
              >
                <UserX size={14} className="mr-1.5" /> Suspend User
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                id="user-activate-btn"
                disabled={loadingAction === "activate"}
                onClick={() => setShowActivateDialog(true)}
                className="text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
              >
                <UserCheck size={14} className="mr-1.5" /> Activate Account
              </Button>
            )}

            {/* Mark Email Verified */}
            <Button
              variant="secondary"
              size="sm"
              id="user-verify-email-btn"
              disabled={isEmailVerified || loadingAction === "verifyEmail"}
              onClick={() => executeAction("verifyEmail", () => verifyUserEmailAction(userId))}
              title={isEmailVerified ? "Email is already verified" : "Manually verify email"}
            >
              <MailCheck size={14} className={`mr-1.5 ${isEmailVerified ? "text-accent-green" : "text-muted"}`} />
              {isEmailVerified ? "Email Verified" : "Verify Email"}
            </Button>

            {/* Send Password Reset */}
            <Button
              variant="secondary"
              size="sm"
              id="user-reset-pwd-btn"
              disabled={loadingAction === "resetPassword"}
              onClick={() => executeAction("resetPassword", () => sendPasswordResetAction(userId))}
            >
              <Key size={14} className="mr-1.5 text-blue-500" />
              {loadingAction === "resetPassword" ? "Sending..." : "Send Reset Link"}
            </Button>

            {/* Set Limit Overrides Modal Trigger */}
            <Button
              variant="secondary"
              size="sm"
              id="user-overrides-btn"
              onClick={() => setShowOverridesModal(true)}
              title="Configure custom resource limits specifically for this user"
            >
              <Sliders size={14} className="mr-1.5 text-purple-500" /> Custom Limit Overrides
            </Button>

            {/* Revoke All Sessions */}
            <Button
              variant="ghost"
              size="sm"
              id="user-revoke-sessions-btn"
              disabled={loadingAction === "revokeSessions"}
              onClick={() => setShowRevokeDialog(true)}
            >
              <LogOut size={14} className="mr-1.5" /> Revoke Sessions
            </Button>

            {/* Soft Delete */}
            {currentStatus !== "pending_delete" && (
              <Button
                variant="danger"
                size="sm"
                id="user-soft-delete-btn"
                disabled={isCurrentAdmin || loadingAction === "softDelete"}
                onClick={() => setShowDeleteDialog(true)}
                title={isCurrentAdmin ? "You cannot delete yourself" : "Mark user as pending deletion"}
              >
                <Trash2 size={14} className="mr-1.5" /> Soft Delete
              </Button>
            )}
          </div>

          {/* Quick Role & Plan Toggles */}
          <div className="pt-3 border-t border-border grid gap-4 sm:grid-cols-2">
            {/* Role selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted flex items-center gap-1.5">
                <Shield size={12} /> Assign Role
              </label>
              <select
                id="user-role-select"
                disabled={(isCurrentAdmin && currentRole === "super_admin") || loadingAction === "role"}
                value={selectedRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 cursor-pointer"
              >
                <option value="user">User (Standard Platform Client)</option>
                <option value="support">Support Specialist (Read users & logs)</option>
                <option value="finance">Finance Manager (Billing & Plans)</option>
                <option value="admin">Admin (Full operations)</option>
                <option value="super_admin">Super Admin (Unrestricted Master)</option>
              </select>
            </div>

            {/* Plan selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted flex items-center gap-1.5">
                <CreditCard size={12} /> Subscription Plan Tier
              </label>
              <select
                id="user-plan-select"
                disabled={loadingAction === "plan"}
                value={selectedPlan}
                onChange={(e) => handlePlanChange(e.target.value)}
                className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 cursor-pointer"
              >
                {planOptions.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name} (/{p.slug})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom Limit Overrides Modal */}
      {showOverridesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-surface rounded-xl border border-border w-full max-w-lg p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400">
                  <Sliders size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-fg">Custom Limit Overrides</h3>
                  <p className="text-xs text-muted">User: {userEmail}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowOverridesModal(false)}
                className="p-1 h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>

            <p className="text-xs text-muted">
              Specify custom resource limits for this individual user. Leave an input blank to
              revert that resource to their base plan&apos;s default quota.
            </p>

            <form onSubmit={handleSaveOverrides} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Monthly Leads
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideLeads}
                    onChange={(e) => setOverrideLeads(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Monthly Social Posts
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideSocialPosts}
                    onChange={(e) => setOverrideSocialPosts(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Monthly Outreach Emails
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideOutreachEmails}
                    onChange={(e) => setOverrideOutreachEmails(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Max Social Accounts
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideSocialAccounts}
                    onChange={(e) => setOverrideSocialAccounts(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Max Email Senders
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideEmailAccounts}
                    onChange={(e) => setOverrideEmailAccounts(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Max Campaigns
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Plan Default"
                    value={overrideCampaigns}
                    onChange={(e) => setOverrideCampaigns(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOverrideLeads("");
                    setOverrideSocialPosts("");
                    setOverrideOutreachEmails("");
                    setOverrideSocialAccounts("");
                    setOverrideEmailAccounts("");
                    setOverrideCampaigns("");
                  }}
                  className="text-xs text-muted hover:text-red-500"
                >
                  Clear All Overrides
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOverridesModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={loadingAction === "overrides"}
                  >
                    {loadingAction === "overrides" ? "Saving..." : "Save Overrides"}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSuspendDialog}
        variant="danger"
        title="Suspend User Account?"
        message={`Are you sure you want to suspend ${userEmail}? This will terminate all active user sessions immediately and pause their running social and outreach campaigns.`}
        confirmText="Suspend User"
        isLoading={loadingAction === "suspend"}
        onClose={() => setShowSuspendDialog(false)}
        onConfirm={async () => {
          setShowSuspendDialog(false);
          await executeAction("suspend", () => suspendUserAction(userId));
        }}
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showActivateDialog}
        variant="primary"
        title="Activate User Account?"
        message={`Restore full platform access for ${userEmail}? The user will be able to log in and resume automations.`}
        confirmText="Activate User"
        isLoading={loadingAction === "activate"}
        onClose={() => setShowActivateDialog(false)}
        onConfirm={async () => {
          setShowActivateDialog(false);
          await executeAction("activate", () => activateUserAction(userId));
        }}
      />

      {/* Revoke Sessions Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevokeDialog}
        variant="warning"
        title="Revoke All Active Sessions?"
        message={`This will invalidate all browser cookies and Redis sessions for ${userEmail}. The user will be forced to log in again on all devices.`}
        confirmText="Revoke Sessions"
        isLoading={loadingAction === "revokeSessions"}
        onClose={() => setShowRevokeDialog(false)}
        onConfirm={async () => {
          setShowRevokeDialog(false);
          await executeAction("revokeSessions", () => revokeAllSessionsAction(userId));
        }}
      />

      {/* Soft Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        variant="danger"
        title="Soft Delete User Account?"
        message={`Mark ${userEmail} as pending deletion? Their active sessions will be terminated and campaigns halted. The account will remain in pending_delete status.`}
        confirmText="Soft Delete Account"
        isLoading={loadingAction === "softDelete"}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={async () => {
          setShowDeleteDialog(false);
          await executeAction("softDelete", () => softDeleteUserAction(userId));
        }}
      />
    </div>
  );
}
