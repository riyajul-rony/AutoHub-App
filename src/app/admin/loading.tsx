export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-bgSubtle" />
          <div className="h-8 w-64 rounded bg-bgSubtle" />
          <div className="h-4 w-96 rounded bg-bgSubtle" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-8 w-28 rounded-md bg-bgSubtle" />
          <div className="h-8 w-28 rounded-md bg-bgSubtle" />
        </div>
      </div>

      {/* 4 Metric Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-3 w-24 rounded bg-bgSubtle" />
              <div className="h-8 w-8 rounded-lg bg-bgSubtle" />
            </div>
            <div className="h-8 w-20 rounded bg-bgSubtle" />
          </div>
        ))}
      </div>

      {/* Global Configuration Status Grid Skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="h-6 w-60 rounded bg-bgSubtle" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-bgSubtle p-4 flex items-center justify-between">
              <div className="space-y-1.5 w-3/4">
                <div className="h-3 w-1/2 rounded bg-surface" />
                <div className="h-4 w-3/4 rounded bg-surface" />
              </div>
              <div className="h-5 w-5 rounded-full bg-surface" />
            </div>
          ))}
        </div>
      </div>

      {/* Users Table Skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 rounded bg-bgSubtle" />
          <div className="h-4 w-28 rounded bg-bgSubtle" />
        </div>

        <div className="space-y-3 pt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border">
              <div className="space-y-1 w-1/4">
                <div className="h-4 w-3/4 rounded bg-bgSubtle" />
                <div className="h-3 w-1/2 rounded bg-bgSubtle" />
              </div>
              <div className="h-4 w-16 rounded-full bg-bgSubtle" />
              <div className="h-4 w-20 rounded bg-bgSubtle" />
              <div className="h-4 w-20 rounded bg-bgSubtle" />
              <div className="h-4 w-24 rounded bg-bgSubtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
