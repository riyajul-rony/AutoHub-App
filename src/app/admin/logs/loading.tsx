export default function AdminLogsLoading() {
  return (
    <div className="space-y-6 pb-16 animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-border rounded-lg" />
          <div className="h-4 w-72 bg-border rounded" />
        </div>
        <div className="h-9 w-36 bg-border rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-3">
        <div className="h-9 w-32 bg-border rounded-lg" />
        <div className="h-9 w-36 bg-border rounded-lg" />
        <div className="h-9 w-28 bg-border rounded-lg" />
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-surface p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="h-9 bg-border rounded-lg" />
        <div className="h-9 bg-border rounded-lg" />
        <div className="h-9 bg-border rounded-lg" />
        <div className="h-9 bg-border rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="h-4 w-32 bg-border rounded" />
          <div className="h-4 w-20 bg-border rounded" />
        </div>
        <div className="divide-y divide-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-border rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-44 bg-border rounded" />
                  <div className="h-3 w-64 bg-border rounded" />
                </div>
              </div>
              <div className="h-6 w-20 bg-border rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
