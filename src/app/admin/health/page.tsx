import { requirePermission } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getRedisConnection } from "@/server/queues";
import { CheckCircle2, XCircle, ShieldCheck, Database, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "System Health — AutoHub Admin",
  description: "Monitor AutoHub database, queues, and container services.",
};

async function checkDbHealth() {
  const start = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return { ok: true, latency: Date.now() - start };
  } catch {
    return { ok: false, latency: 0 };
  }
}

export default async function AdminHealthPage() {
  await requirePermission("logs.read");

  const { ok: dbOk, latency: dbLatency } = await checkDbHealth();

  let redisOk = false;
  try {
    const redis = getRedisConnection();
    const pong = await redis.ping();
    redisOk = pong === "PONG";
  } catch {
    redisOk = false;
  }

  const [userCount, postRunCount, campaignCount] = await Promise.all([
    db.users.count().catch(() => 0),
    db.post_runs.count().catch(() => 0),
    db.social_campaigns.count().catch(() => 0),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand border border-brand/20">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-fg">System Health &amp; Status</h1>
          <p className="text-xs sm:text-sm text-muted">Admin panel monitoring services, databases, and queues.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Database size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-fg">PostgreSQL 16</h2>
                <span className="text-xs text-muted">Relational Database</span>
              </div>
            </div>
            {dbOk ? (
              <Badge variant="success" className="gap-1 text-xs">
                <CheckCircle2 size={13} /> UP ({dbLatency}ms)
              </Badge>
            ) : (
              <Badge variant="danger" className="gap-1 text-xs">
                <XCircle size={13} /> DOWN
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted">Primary database for campaigns, leads, and audit logs.</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400">
                <Server size={20} />
              </span>
              <div>
                <h2 className="font-semibold text-fg">Redis 7 (BullMQ)</h2>
                <span className="text-xs text-muted">Task Broker</span>
              </div>
            </div>
            {redisOk ? (
              <Badge variant="success" className="gap-1 text-xs">
                <CheckCircle2 size={13} /> CONNECTED
              </Badge>
            ) : (
              <Badge variant="danger" className="gap-1 text-xs">
                <XCircle size={13} /> UNREACHABLE
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted">In-memory message broker for asynchronous job execution.</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <h2 className="text-base font-semibold text-fg">Database Totals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
          <div className="rounded-lg bg-bgSubtle border border-border p-4">
            <div className="text-2xl font-bold font-mono text-fg">{userCount.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">Total Users</div>
          </div>
          <div className="rounded-lg bg-bgSubtle border border-border p-4">
            <div className="text-2xl font-bold font-mono text-fg">{campaignCount.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">Active Campaigns</div>
          </div>
          <div className="rounded-lg bg-bgSubtle border border-border p-4">
            <div className="text-2xl font-bold font-mono text-fg">{postRunCount.toLocaleString()}</div>
            <div className="text-xs text-muted mt-1">Total Post Runs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
