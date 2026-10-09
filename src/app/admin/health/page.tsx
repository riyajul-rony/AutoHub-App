import { requireAdmin } from "@/server/auth/guards";
import { db } from "@/server/db";
import { getRedisConnection } from "@/server/queues";
import { CheckCircle2, XCircle, ShieldCheck, Database, Server } from "lucide-react";

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
  await requireAdmin();

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
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/20 text-brand">
          <ShieldCheck size={22} />
        </span>
        <div>
          <h1 className="text-3xl font-bold">System Health & Status</h1>
          <p className="text-xs text-muted">Admin panel monitoring services, databases, and queues.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="text-brand-2" size={24} />
              <h2 className="font-semibold">PostgreSQL 16</h2>
            </div>
            {dbOk ? (
              <span className="badge border-accent-green/40 text-accent-green">
                <CheckCircle2 size={13} /> UP ({dbLatency}ms)
              </span>
            ) : (
              <span className="badge border-danger/40 text-danger">
                <XCircle size={13} /> DOWN
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">Primary database for campaigns, leads, and audit logs.</p>
        </div>

        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="text-accent-pink" size={24} />
              <h2 className="font-semibold">Redis 7 (BullMQ)</h2>
            </div>
            {redisOk ? (
              <span className="badge border-accent-green/40 text-accent-green">
                <CheckCircle2 size={13} /> CONNECTED
              </span>
            ) : (
              <span className="badge border-danger/40 text-danger">
                <XCircle size={13} /> UNREACHABLE
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">In-memory message broker for asynchronous job execution.</p>
        </div>
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-bold">Database Totals</h2>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-2xl font-bold">{userCount}</div>
            <div className="text-xs text-muted">Total Users</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-2xl font-bold">{campaignCount}</div>
            <div className="text-xs text-muted">Active Campaigns</div>
          </div>
          <div className="rounded-xl bg-surface-2 p-4">
            <div className="text-2xl font-bold">{postRunCount}</div>
            <div className="text-xs text-muted">Total Post Runs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
