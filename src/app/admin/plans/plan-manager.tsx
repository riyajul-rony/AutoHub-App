"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  Sparkles,
  Zap,
  Mail,
  Share2,
  Briefcase,
  AlertCircle,
  X,
} from "lucide-react";
import {
  createPlanAction,
  updatePlanAction,
  togglePlanStatusAction,
  deletePlanAction,
} from "@/server/admin/plan-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export interface PlanItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  is_active: boolean;
  features: string[];
  monthly_leads: number;
  monthly_social_posts: number;
  monthly_outreach_emails: number;
  max_social_accounts: number;
  max_email_accounts: number;
  max_campaigns: number;
  subscriber_count: number;
  created_at: string;
}

export function PlanManager({ initialPlans }: { initialPlans: PlanItem[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans);
  const [isPending, startTransition] = useTransition();

  // Filter/Search
  const [search, setSearch] = useState("");

  // Modal states
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [planToDelete, setPlanToDelete] = useState<PlanItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriceMonthly, setFormPriceMonthly] = useState("0");
  const [formPriceYearly, setFormPriceYearly] = useState("0");
  const [formCurrency, setFormCurrency] = useState("USD");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFeatures, setFormFeatures] = useState("");
  const [formMonthlyLeads, setFormMonthlyLeads] = useState("100");
  const [formMonthlySocialPosts, setFormMonthlySocialPosts] = useState("30");
  const [formMonthlyOutreachEmails, setFormMonthlyOutreachEmails] = useState("100");
  const [formMaxSocialAccounts, setFormMaxSocialAccounts] = useState("2");
  const [formMaxEmailAccounts, setFormMaxEmailAccounts] = useState("1");
  const [formMaxCampaigns, setFormMaxCampaigns] = useState("2");

  const openCreateModal = () => {
    setActionError(null);
    setModalMode("create");
    setEditingPlan(null);
    setFormName("");
    setFormSlug("");
    setFormDescription("");
    setFormPriceMonthly("0");
    setFormPriceYearly("0");
    setFormCurrency("USD");
    setFormIsActive(true);
    setFormFeatures("Lead Discovery, AI Outreach Generator, Cold Email Campaigns, Standard Support");
    setFormMonthlyLeads("500");
    setFormMonthlySocialPosts("100");
    setFormMonthlyOutreachEmails("500");
    setFormMaxSocialAccounts("3");
    setFormMaxEmailAccounts("2");
    setFormMaxCampaigns("3");
  };

  const openEditModal = (plan: PlanItem) => {
    setActionError(null);
    setModalMode("edit");
    setEditingPlan(plan);
    setFormName(plan.name);
    setFormSlug(plan.slug);
    setFormDescription(plan.description || "");
    setFormPriceMonthly(String(plan.price_monthly));
    setFormPriceYearly(String(plan.price_yearly));
    setFormCurrency(plan.currency);
    setFormIsActive(plan.is_active);
    setFormFeatures(plan.features.join(", "));
    setFormMonthlyLeads(String(plan.monthly_leads));
    setFormMonthlySocialPosts(String(plan.monthly_social_posts));
    setFormMonthlyOutreachEmails(String(plan.monthly_outreach_emails));
    setFormMaxSocialAccounts(String(plan.max_social_accounts));
    setFormMaxEmailAccounts(String(plan.max_email_accounts));
    setFormMaxCampaigns(String(plan.max_campaigns));
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingPlan(null);
    setActionError(null);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    const parsedFeatures = formFeatures
      .split(/[\n,]+/)
      .map((f) => f.trim())
      .filter(Boolean);

    startTransition(async () => {
      try {
        if (modalMode === "create") {
          await createPlanAction({
            name: formName,
            slug: formSlug,
            description: formDescription || undefined,
            price_monthly: parseFloat(formPriceMonthly) || 0,
            price_yearly: parseFloat(formPriceYearly) || 0,
            currency: formCurrency,
            is_active: formIsActive,
            features: parsedFeatures,
            monthly_leads: parseInt(formMonthlyLeads, 10) || 0,
            monthly_social_posts: parseInt(formMonthlySocialPosts, 10) || 0,
            monthly_outreach_emails: parseInt(formMonthlyOutreachEmails, 10) || 0,
            max_social_accounts: parseInt(formMaxSocialAccounts, 10) || 1,
            max_email_accounts: parseInt(formMaxEmailAccounts, 10) || 1,
            max_campaigns: parseInt(formMaxCampaigns, 10) || 1,
          });
        } else if (modalMode === "edit" && editingPlan) {
          await updatePlanAction(editingPlan.id, {
            name: formName,
            slug: formSlug,
            description: formDescription || undefined,
            price_monthly: parseFloat(formPriceMonthly) || 0,
            price_yearly: parseFloat(formPriceYearly) || 0,
            currency: formCurrency,
            is_active: formIsActive,
            features: parsedFeatures,
            monthly_leads: parseInt(formMonthlyLeads, 10) || 0,
            monthly_social_posts: parseInt(formMonthlySocialPosts, 10) || 0,
            monthly_outreach_emails: parseInt(formMonthlyOutreachEmails, 10) || 0,
            max_social_accounts: parseInt(formMaxSocialAccounts, 10) || 1,
            max_email_accounts: parseInt(formMaxEmailAccounts, 10) || 1,
            max_campaigns: parseInt(formMaxCampaigns, 10) || 1,
          });
        }

        closeModal();
        router.refresh();
      } catch (err: any) {
        setActionError(err.message || "An unexpected error occurred");
      }
    });
  };

  const handleToggleStatus = (plan: PlanItem) => {
    startTransition(async () => {
      try {
        await togglePlanStatusAction(plan.id);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Failed to toggle status");
      }
    });
  };

  const handleDelete = () => {
    if (!planToDelete) return;
    startTransition(async () => {
      try {
        await deletePlanAction(planToDelete.id);
        setPlanToDelete(null);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Failed to delete plan");
      }
    });
  };

  const filteredPlans = plans.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={14} />
          <input
            type="text"
            placeholder="Search plans by name or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 rounded-md border border-border-input bg-surface pl-8 pr-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 placeholder:text-muted"
          />
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          id="btn-create-plan"
          size="sm"
        >
          <Plus size={14} className="mr-1.5" /> Create New Plan
        </Button>
      </div>

      {/* Plans Card Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {filteredPlans.map((plan) => {
          const isFree = plan.slug === "free" || plan.price_monthly === 0;

          return (
            <Card
              key={plan.id}
              className={`flex flex-col justify-between transition-shadow relative overflow-hidden ${
                !plan.is_active
                  ? "opacity-60 bg-surface"
                  : plan.slug === "pro"
                  ? "border-brand shadow-xs ring-1 ring-brand/30"
                  : "hover:border-border-input"
              }`}
            >
              {plan.slug === "pro" && (
                <div className="absolute top-0 right-0 bg-brand text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-bl-md flex items-center gap-1 shadow-xs">
                  <Sparkles size={10} /> Popular
                </div>
              )}

              <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-base text-fg flex items-center gap-1.5">
                        {plan.name}
                        {plan.is_active ? (
                          <Badge variant="success" size="sm">Active</Badge>
                        ) : (
                          <Badge variant="danger" size="sm">Inactive</Badge>
                        )}
                      </h3>
                      <span className="font-mono text-xs text-muted">/{plan.slug}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="my-2.5 pb-2.5 border-b border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-fg">
                        {isFree ? "$0" : `$${plan.price_monthly}`}
                      </span>
                      <span className="text-xs text-muted">/month</span>
                    </div>
                    {!isFree && (
                      <div className="text-xs text-muted mt-0.5">
                        ${plan.price_yearly}/yr billed annually ({plan.currency})
                      </div>
                    )}
                    {plan.description && (
                      <p className="text-xs text-muted mt-1.5 line-clamp-2">{plan.description}</p>
                    )}
                  </div>

                  {/* Subscribers count badge */}
                  <div className="mb-3 flex items-center gap-2 text-xs text-muted bg-bgSubtle px-2.5 py-1.5 rounded-md border border-border">
                    <Users size={13} className="text-brand" />
                    <span>
                      <strong className="text-fg">{plan.subscriber_count}</strong> active{" "}
                      {plan.subscriber_count === 1 ? "subscriber" : "subscribers"}
                    </span>
                  </div>

                  {/* Quotas & Limits Specs */}
                  <div className="space-y-1.5 text-xs py-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1 flex items-center gap-1">
                      <Zap size={11} className="text-amber-500" /> Resource Quotas
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border text-muted">
                      <span className="flex items-center gap-1.5">
                        <Search size={12} className="text-blue-500" /> Leads / mo:
                      </span>
                      <strong className="text-fg font-mono">
                        {plan.monthly_leads >= 999999 ? "Unlimited" : plan.monthly_leads.toLocaleString()}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border text-muted">
                      <span className="flex items-center gap-1.5">
                        <Share2 size={12} className="text-purple-500" /> Social Posts / mo:
                      </span>
                      <strong className="text-fg font-mono">
                        {plan.monthly_social_posts >= 999999 ? "Unlimited" : plan.monthly_social_posts.toLocaleString()}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border text-muted">
                      <span className="flex items-center gap-1.5">
                        <Mail size={12} className="text-amber-500" /> Outreach Emails:
                      </span>
                      <strong className="text-fg font-mono">
                        {plan.monthly_outreach_emails >= 999999 ? "Unlimited" : plan.monthly_outreach_emails.toLocaleString()}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-border text-muted">
                      <span className="flex items-center gap-1.5">
                        <Briefcase size={12} className="text-emerald-500" /> Max Campaigns:
                      </span>
                      <strong className="text-fg font-mono">{plan.max_campaigns}</strong>
                    </div>

                    <div className="flex items-center justify-between py-1 text-muted">
                      <span>Inboxes:</span>
                      <span className="text-fg font-mono font-medium">
                        {plan.max_email_accounts} email / {plan.max_social_accounts} social
                      </span>
                    </div>
                  </div>

                  {/* Included Features */}
                  {plan.features && plan.features.length > 0 && (
                    <div className="mt-2.5 pt-2.5 border-t border-border space-y-1">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                        Features
                      </div>
                      <ul className="text-xs space-y-1 text-muted">
                        {plan.features.slice(0, 4).map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 size={12} className="text-accent-green shrink-0" />
                            <span className="truncate">{feat}</span>
                          </li>
                        ))}
                        {plan.features.length > 4 && (
                          <li className="text-xs text-muted italic">
                            +{plan.features.length - 4} more features
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-border flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditModal(plan)}
                    className="flex-1"
                  >
                    <Edit2 size={12} className="mr-1" /> Edit
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStatus(plan)}
                    disabled={isPending}
                    className={`h-8 px-2.5 ${plan.is_active ? "text-amber-500 hover:text-amber-600" : "text-emerald-500 hover:text-emerald-600"}`}
                    title={plan.is_active ? "Deactivate Plan" : "Activate Plan"}
                  >
                    {plan.is_active ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPlanToDelete(plan)}
                    disabled={isPending || plan.subscriber_count > 0}
                    className="h-8 px-2.5 text-muted hover:text-red-500 disabled:opacity-30"
                    title={
                      plan.subscriber_count > 0
                        ? "Cannot delete plan with active subscribers. Deactivate it instead."
                        : "Delete Plan"
                    }
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredPlans.length === 0 && (
        <Card className="p-10 text-center space-y-2">
          <Layers size={32} className="mx-auto text-muted/60" />
          <h4 className="text-sm font-semibold text-fg">No Plans Found</h4>
          <p className="text-xs text-muted max-w-sm mx-auto">
            {search ? `No plans match "${search}".` : "No plans configured in the platform."}
          </p>
        </Card>
      )}

      {/* Create / Edit Plan Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
          <div className="bg-surface rounded-xl border border-border w-full max-w-2xl p-6 shadow-2xl relative space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand/10 border border-brand/20 text-brand">
                  <Layers size={18} />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-fg">
                    {modalMode === "create" ? "Create New Subscription Plan" : `Edit Plan: ${editingPlan?.name}`}
                  </h3>
                  <p className="text-xs text-muted">
                    Configure pricing, features, and resource quotas.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={closeModal}
                disabled={isPending}
                className="p-1 h-8 w-8"
              >
                <X size={16} />
              </Button>
            </div>

            {actionError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Plan Display Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (modalMode === "create" && !formSlug) {
                        setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                      }
                    }}
                    placeholder="e.g. Growth Pro"
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Slug Identifier * (unique, lowercase)
                  </label>
                  <input
                    type="text"
                    required
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="e.g. growth-pro"
                    className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short summary for this plan tier..."
                  className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                />
              </div>

              {/* Pricing */}
              <div className="p-4 rounded-lg bg-bgSubtle border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand" /> Pricing &amp; Billing
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Monthly Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPriceMonthly}
                      onChange={(e) => setFormPriceMonthly(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Yearly Price ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPriceYearly}
                      onChange={(e) => setFormPriceYearly(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value.toUpperCase())}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs uppercase font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="plan-is-active-check"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-border text-brand focus:ring-brand"
                  />
                  <label htmlFor="plan-is-active-check" className="text-xs text-fg select-none">
                    Plan is active and available for subscription / assignment
                  </label>
                </div>
              </div>

              {/* Resource Quotas */}
              <div className="p-4 rounded-lg bg-bgSubtle border border-border space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted flex items-center gap-1.5">
                  <Zap size={13} className="text-amber-500" /> Resource Limits (Monthly &amp; Hard Caps)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Monthly Leads
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formMonthlyLeads}
                      onChange={(e) => setFormMonthlyLeads(e.target.value)}
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
                      value={formMonthlySocialPosts}
                      onChange={(e) => setFormMonthlySocialPosts(e.target.value)}
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
                      value={formMonthlyOutreachEmails}
                      onChange={(e) => setFormMonthlyOutreachEmails(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Max Social Accounts
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxSocialAccounts}
                      onChange={(e) => setFormMaxSocialAccounts(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Max Email Senders
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxEmailAccounts}
                      onChange={(e) => setFormMaxEmailAccounts(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">
                      Max Active Campaigns
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formMaxCampaigns}
                      onChange={(e) => setFormMaxCampaigns(e.target.value)}
                      className="w-full h-9 rounded-md border border-border-input bg-surface px-3 text-xs font-mono text-fg focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                    />
                  </div>
                </div>
              </div>

              {/* Features list */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Features (comma or line separated)
                </label>
                <textarea
                  rows={3}
                  value={formFeatures}
                  onChange={(e) => setFormFeatures(e.target.value)}
                  placeholder="e.g. Lead Discovery, AI Outreach Generator, Multi-Account Senders, Priority Support"
                  className="w-full p-2.5 rounded-md border border-border-input bg-surface text-xs text-fg leading-relaxed focus:border-focus-ring focus:outline-none focus:ring-2 focus:ring-focus-ring/20"
                />
              </div>

              {/* Form buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeModal}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : modalMode === "create" ? "Create Plan" : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={Boolean(planToDelete)}
        title={`Delete Plan "${planToDelete?.name}"?`}
        message={`Are you sure you want to delete the plan "${planToDelete?.slug}"? Note: If any user is currently assigned to this plan, deletion will be blocked by system safety guards.`}
        confirmText="Delete Plan"
        variant="danger"
        isLoading={isPending}
        onConfirm={handleDelete}
        onClose={() => setPlanToDelete(null)}
      />
    </div>
  );
}
