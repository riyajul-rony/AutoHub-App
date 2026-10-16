export default function AdminUsersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between pb-5 border-b border-border">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-bgSubtle rounded-full" />
          <div className="h-7 w-64 bg-bgSubtle rounded" />
          <div className="h-4 w-96 bg-bgSubtle rounded" />
        </div>
      </div>

      {/* Filter bar skeleton */}
      <div className="rounded-xl border border-border bg-surface p-4 flex flex-wrap gap-3">
        <div className="h-9 flex-1 min-w-[200px] bg-bgSubtle rounded-md" />
        <div className="h-9 w-36 bg-bgSubtle rounded-md" />
        <div className="h-9 w-36 bg-bgSubtle rounded-md" />
        <div className="h-9 w-36 bg-bgSubtle rounded-md" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <div className="h-5 w-40 bg-bgSubtle rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 w-full bg-bgSubtle rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
