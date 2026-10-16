export default function AdminUserDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse pb-12">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-bgSubtle rounded-md" />
        <div className="h-5 w-24 bg-bgSubtle rounded-full" />
      </div>

      {/* Profile Header skeleton */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-bgSubtle rounded-xl" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-bgSubtle rounded" />
            <div className="h-4 w-64 bg-bgSubtle rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-bgSubtle rounded-full" />
              <div className="h-5 w-16 bg-bgSubtle rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 bg-bgSubtle rounded-md" />
          <div className="h-8 w-28 bg-bgSubtle rounded-md" />
        </div>
      </div>

      {/* Grid of stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-surface p-5 h-24" />
        ))}
      </div>

      {/* Two columns for activity & sessions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 h-72" />
        <div className="rounded-xl border border-border bg-surface p-6 h-72" />
      </div>
    </div>
  );
}
