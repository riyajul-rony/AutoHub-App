export default function AdminPlansLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-5 border-b border-border">
        <div className="space-y-2">
          <div className="h-5 w-36 bg-bgSubtle rounded-full" />
          <div className="h-8 w-64 bg-bgSubtle rounded" />
          <div className="h-4 w-96 bg-bgSubtle rounded" />
        </div>
      </div>

      {/* Plans Grid Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-5 w-24 bg-bgSubtle rounded" />
              <div className="h-5 w-16 bg-bgSubtle rounded-full" />
            </div>
            <div className="h-8 w-28 bg-bgSubtle rounded" />
            <div className="h-4 w-full bg-bgSubtle rounded" />
            <div className="space-y-2 pt-3 border-t border-border">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="h-3 w-full bg-bgSubtle rounded" />
              ))}
            </div>
            <div className="pt-3 flex gap-2">
              <div className="h-8 flex-1 bg-bgSubtle rounded-md" />
              <div className="h-8 w-12 bg-bgSubtle rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
