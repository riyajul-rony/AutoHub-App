import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/guards";
import { cacheRemember } from "@/server/cache";
import { PageHeader, Card, CardContent, Badge } from "@/components/ui";

export const metadata = {
  title: "Hub — AutoHub",
  description: "Select an automation engine to get started.",
};

export default async function HubPage() {
  const user = await requireUser();
  const userId = user.id;

  const [postsCount, leadsCount, emailsCount] = await cacheRemember(
    `stats:hub:${userId}`,
    90,
    async () => {
      return await Promise.all([
        db.post_runs.count({ where: { user_id: userId, status: "published" } }),
        db.leads.count({ where: { user_id: userId } }),
        db.email_messages.count({ where: { user_id: userId, direction: "out", status: "sent" } }),
      ]);
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Automation Hub"
        description="Select an engine to create social posts, collect leads, or dispatch email campaigns."
        badge={
          <Badge variant="accent" size="sm">
            Active Workspace
          </Badge>
        }
      />

      {/* 4 Core Module Cards */}
      <section className="grid gap-4 sm:grid-cols-2" aria-label="Automation engines">
        {MODULES.map((m) => (
          <Link
            key={m.id}
            id={`hub-card-${m.id}`}
            href={m.href}
            className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring rounded-[8px]"
          >
            <Card className="h-full transition-colors hover:border-text-muted hover:bg-surface-hover/30 p-5 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-[6px] border border-border bg-bg-subtle text-text flex items-center justify-center">
                    <m.icon className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-subtle group-hover:text-text transition-colors" strokeWidth={1.5} />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-text group-hover:text-accent-text transition-colors">
                    {m.title}
                  </h2>
                  <p className="text-xs text-text-muted mt-1 leading-normal line-clamp-2">
                    {m.description}
                  </p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap gap-1.5">
                {m.options.map((o) => (
                  <Badge key={o.href} variant="neutral" size="sm">
                    {o.label}
                  </Badge>
                ))}
              </div>
            </Card>
          </Link>
        ))}
      </section>

      {/* Lifetime Performance Counters */}
      <section className="grid gap-4 sm:grid-cols-3" aria-label="Quick metrics">
        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-text-muted">Social Posts Published</p>
          <p className="text-2xl font-bold font-mono tracking-tight text-text">
            {postsCount.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-text-muted">Leads Collected</p>
          <p className="text-2xl font-bold font-mono tracking-tight text-text">
            {leadsCount.toLocaleString()}
          </p>
        </Card>

        <Card className="p-4 space-y-1">
          <p className="text-xs font-medium text-text-muted">Emails Dispatched</p>
          <p className="text-2xl font-bold font-mono tracking-tight text-text">
            {emailsCount.toLocaleString()}
          </p>
        </Card>
      </section>
    </div>
  );
}
