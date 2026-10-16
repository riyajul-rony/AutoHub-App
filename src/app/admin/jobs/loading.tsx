export default function AdminJobsLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-44 rounded-full bg-border" />
          <div className="h-8 w-60 rounded-lg bg-border" />
          <div className="h-4 w-96 rounded bg-border" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-32 rounded-lg bg-border" />
        </div>
      </div>

      {/* Overview Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-border" />
              <div className="h-6 w-16 rounded-full bg-border" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-12 rounded-lg bg-border" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Failed Jobs Table Skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-border" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded-lg bg-border" />
          ))}
        </div>
      </div>
    </div>
  );
}
