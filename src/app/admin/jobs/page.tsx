import Link from "next/link";
import {
  Workflow,
  Cpu,
  Layers,
  Activity,
  AlertCircle,
  RotateCcw,
  Clock,
  CheckCircle2,
  Filter,
  ScrollText,
} from "lucide-react";
import { requirePermission } from "@/server/auth/guards";
import { getAllQueuesOverview, getFailedJobs } from "@/server/queues/manager";
import { StatCard } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { QueueCard } from "./queue-card";
import { FailedJobRow } from "./failed-job-row";

export const metadata = {
  title: "Queues & Jobs — Lead Reach AI Admin",
  description: "Monitor BullMQ queues, workers, and resolve failed execution runs.",
};

interface AdminJobsPageProps {
  searchParams: Promise<{
    queue?: string;
  }>;
}

export default async function AdminJobsPage({ searchParams }: AdminJobsPageProps) {
  await requirePermission("logs.read");

  const resolvedParams = await searchParams;
  const selectedQueue = resolvedParams.queue?.trim() || "";

  const { queues, redisOnline } = await getAllQueuesOverview();
  const failedJobs = await getFailedJobs(selectedQueue || undefined, 50);

  // Totals across all queues
  const totalWaiting = queues.reduce((acc, q) => acc + q.waiting, 0);
  const totalActive = queues.reduce((acc, q) => acc + q.active, 0);
  const totalCompleted = queues.reduce((acc, q) => acc + q.completed, 0);
  const totalFailed = queues.reduce((acc, q) => acc + q.failed, 0);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand/10 text-brand border border-brand/20 mb-2">
            <Workflow size={12} />
            Background Processing Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">
            Queues &amp; <span className="text-brand">Jobs</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Inspect real-time BullMQ queues, pause/resume workers, and retry failed execution jobs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/logs?tab=errors">
            <Button variant="secondary" size="sm">
              <ScrollText size={14} className="mr-1.5" /> System Error Logs
            </Button>
          </Link>
          <Link href="/admin/health">
            <Button variant="secondary" size="sm">
              <Activity size={14} className="mr-1.5" /> Service Health
            </Button>
          </Link>
        </div>
      </div>

      {/* Redis degraded warning if applicable */}
      {!redisOnline && (
        <div className="rounded-xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-200">
          <AlertCircle size={18} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <div className="font-semibold">Redis Connection Degraded / Mock Mode Active</div>
            <div className="text-muted mt-0.5">
              Lead Reach AI is operating with internal fallback workers. Connect a live Redis instance to view production job streams.
            </div>
          </div>
        </div>
      )}

      {/* Aggregated Totals Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting Jobs"
          value={totalWaiting.toLocaleString()}
          icon={Clock}
          subtext="Enqueued in worker queues"
          color="text-sky-600 dark:text-sky-400"
          bg="bg-sky-50 dark:bg-sky-950/40"
        />
        <StatCard
          label="Active Workers"
          value={totalActive.toLocaleString()}
          icon={Cpu}
          subtext="Currently executing"
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-50 dark:bg-emerald-950/40"
        />
        <StatCard
          label="Completed Jobs"
          value={totalCompleted.toLocaleString()}
          icon={CheckCircle2}
          subtext="Processed successfully"
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-50 dark:bg-purple-950/40"
        />
        <StatCard
          label="Failed Jobs"
          value={totalFailed.toLocaleString()}
          icon={AlertCircle}
          subtext="Requires retry or inspection"
          color={totalFailed > 0 ? "text-red-600 dark:text-red-400" : "text-muted"}
          bg={totalFailed > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-bgSubtle"}
        />
      </div>

      {/* Queues Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-fg">Registered BullMQ Queues</h3>
            <p className="text-xs text-muted mt-0.5">Live counters and execution toggles for each subsystem worker.</p>
          </div>
          <span className="text-xs text-muted font-medium">{queues.length} active queues</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {queues.map((q) => (
            <QueueCard key={q.name} queue={q} />
          ))}
        </div>
      </div>

      {/* Failed Jobs Table Section */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-fg flex items-center gap-2">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
              Failed Job Exceptions
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Inspect failed job errors, execution stack traces, and trigger manual retries.
            </p>
          </div>

          <form method="GET" action="/admin/jobs" className="flex items-center gap-2">
            <select
              name="queue"
              defaultValue={selectedQueue}
              className="w-48 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            >
              <option value="">All Queues</option>
              {queues.map((q) => (
                <option key={q.name} value={q.name}>
                  {q.displayName} ({q.failed} failed)
                </option>
              ))}
            </select>
            <Button type="submit" variant="primary" size="sm">
              <Filter size={13} className="mr-1" /> Filter
            </Button>
            {selectedQueue && (
              <Link href="/admin/jobs">
                <Button variant="ghost" size="sm" title="Reset Filter">
                  <RotateCcw size={13} />
                </Button>
              </Link>
            )}
          </form>
        </div>

        {failedJobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={24} />
            </div>
            <div className="text-sm font-semibold text-fg">No failed jobs recorded</div>
            <p className="text-xs text-muted max-w-sm mx-auto">
              All worker queues are processing cleanly without fatal unhandled exceptions.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-bgSubtle border-b border-border text-muted">
                <tr>
                  <th className="py-3 px-4 font-semibold">Job ID &amp; Queue</th>
                  <th className="py-3 px-4 font-semibold">User / Tenant</th>
                  <th className="py-3 px-4 font-semibold">Error Message</th>
                  <th className="py-3 px-4 font-semibold">Failed At</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {failedJobs.map((job) => (
                  <FailedJobRow key={`${job.queueName}_${job.id}`} job={job} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
