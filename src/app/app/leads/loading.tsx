export default function LeadsLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-56 rounded bg-bgSubtle" />
          <div className="h-4 w-80 rounded bg-bgSubtle" />
        </div>
        <div className="h-9 w-36 rounded-md bg-bgSubtle" />
      </div>

      {/* 3 Lead Source Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[8px] border border-border bg-surface p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-5 w-28 rounded bg-bgSubtle" />
              <div className="h-5 w-12 rounded-full bg-bgSubtle" />
            </div>
            <div className="h-3 w-full rounded bg-bgSubtle" />
            <div className="h-3 w-4/5 rounded bg-bgSubtle" />
          </div>
        ))}
      </div>

      {/* Leads Table Container Skeleton */}
      <div className="rounded-[8px] border border-border bg-surface p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="h-5 w-40 rounded bg-bgSubtle" />
          <div className="h-8 w-24 rounded-md bg-bgSubtle" />
        </div>

        <div className="space-y-3 pt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border">
              <div className="space-y-1.5 w-1/4">
                <div className="h-4 w-3/4 rounded bg-bgSubtle" />
                <div className="h-3 w-1/2 rounded bg-bgSubtle" />
              </div>
              <div className="h-4 w-1/5 rounded bg-bgSubtle" />
              <div className="h-4 w-1/6 rounded bg-bgSubtle" />
              <div className="h-4 w-1/6 rounded bg-bgSubtle" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
