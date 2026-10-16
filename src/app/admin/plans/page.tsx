import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { PlanManager, PlanItem } from "./plan-manager";
import { Layers, CheckCircle2, Users, Sparkles } from "lucide-react";
import { StatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Plans & Limits — AutoHub Admin",
  description: "Configure subscription plans, feature packages, and global resource limits.",
};

export default async function AdminPlansPage() {
  await requirePermission("plans.manage");

  // Fetch all plans ordered by monthly_price
  const rawPlans = await db.plans.findMany({
    orderBy: { monthly_price: "asc" },
  });

  // Calculate subscribers per plan
  const plansWithCounts: PlanItem[] = await Promise.all(
    rawPlans.map(async (p: any) => {
      const subscriberCount = await db.users.count({
        where: {
          OR: [{ plan: p.slug }, { plan_id: p.id }],
        },
      });

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price_monthly: Number(p.monthly_price ?? p.price_monthly ?? 0),
        price_yearly: Number(p.yearly_price ?? p.price_yearly ?? 0),
        currency: p.currency,
        is_active: Boolean(p.is_active),
        features: Array.isArray(p.features) ? p.features : [],
        monthly_leads: Number(p.monthly_leads),
        monthly_social_posts: Number(p.monthly_social_posts),
        monthly_outreach_emails: Number(p.monthly_outreach_emails),
        max_social_accounts: Number(p.max_social_accounts),
        max_email_accounts: Number(p.max_email_accounts),
        max_campaigns: Number(p.max_campaigns),
        subscriber_count: subscriberCount,
        created_at: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString(),
      };
    })
  );

  const totalPlans = plansWithCounts.length;
  const activePlans = plansWithCounts.filter((p) => p.is_active).length;
  const totalSubscribers = plansWithCounts.reduce((acc, p) => acc + p.subscriber_count, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="accent" size="sm">
              <Layers size={11} className="mr-1" /> Tier &amp; Quotas Management
            </Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-fg md:text-3xl mt-2">
            Subscription Plans &amp; Limits
          </h1>
          <p className="text-xs text-muted mt-1 max-w-2xl">
            Create, edit, and toggle platform tiers. Set resource quotas and plan features.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Plans"
          value={totalPlans}
          icon={Layers}
          subtext="Configured billing tiers"
          color="text-brand"
          bg="bg-brand/10"
        />
        <StatCard
          label="Active Plans"
          value={activePlans}
          icon={CheckCircle2}
          subtext="Available for signup"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <StatCard
          label="Total Assigned Users"
          value={totalSubscribers}
          icon={Users}
          subtext="Active accounts on tiers"
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-500/10"
        />
        <StatCard
          label="Default Tier"
          value="Free"
          icon={Sparkles}
          subtext="Auto-assigned to new signups"
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
        />
      </div>

      {/* Plan Manager Client Component */}
      <PlanManager initialPlans={plansWithCounts} />
    </div>
  );
}
