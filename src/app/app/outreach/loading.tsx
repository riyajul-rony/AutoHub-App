export default function OutreachLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded bg-bgSubtle" />
          <div className="h-4 w-72 rounded bg-bgSubtle" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-32 rounded-md bg-bgSubtle" />
          <div className="h-9 w-32 rounded-md bg-bgSubtle" />
        </div>
      </div>

      {/* 2 Campaign Mode Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-6 w-36 rounded bg-bgSubtle" />
              <div className="h-5 w-16 rounded-full bg-bgSubtle" />
            </div>
            <div className="h-4 w-4/5 rounded bg-bgSubtle" />
            <div className="h-4 w-24 rounded bg-bgSubtle pt-2" />
          </div>
        ))}
      </div>

      {/* Campaign List Skeleton */}
      <div className="space-y-4">
        <div className="h-5 w-36 rounded bg-bgSubtle" />
        <div className="rounded-xl border border-border bg-surface p-5 divide-y divide-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-4 flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-5 w-52 rounded bg-bgSubtle" />
                <div className="h-3 w-40 rounded bg-bgSubtle" />
              </div>
              <div className="flex items-center gap-4">
                <div className="h-6 w-20 rounded-full bg-bgSubtle" />
                <div className="h-5 w-5 rounded bg-bgSubtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
