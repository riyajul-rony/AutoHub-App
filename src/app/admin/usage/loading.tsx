export default function AdminUsageLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-border" />
          <div className="h-8 w-64 rounded-lg bg-border" />
          <div className="h-4 w-96 rounded bg-border" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-32 rounded-lg bg-border" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-border" />
              <div className="h-8 w-8 rounded-lg bg-border" />
            </div>
            <div className="h-8 w-20 rounded bg-border" />
          </div>
        ))}
      </div>

      {/* Chart Skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-border" />
        <div className="h-56 w-full rounded-xl bg-border" />
      </div>

      {/* Top Consumers & Table Skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-6 w-40 rounded bg-border" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
