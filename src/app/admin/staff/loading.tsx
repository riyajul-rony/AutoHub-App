export default function StaffLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 bg-border rounded-lg" />
        <div className="h-6 w-36 bg-border rounded-full" />
      </div>

      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-7 w-56 bg-border rounded-lg" />
          <div className="h-4 w-80 bg-border rounded" />
        </div>
        <div className="h-9 w-36 bg-border rounded-lg" />
      </div>

      <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
        <div className="flex justify-between items-center pb-2">
          <div className="h-8 w-64 bg-border rounded-lg" />
          <div className="h-8 w-32 bg-border rounded-lg" />
        </div>

        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 border-b border-border">
              <div className="space-y-1 w-1/4">
                <div className="h-4 w-3/4 bg-border rounded" />
                <div className="h-3 w-1/2 bg-border rounded" />
              </div>
              <div className="h-5 w-24 bg-border rounded-full" />
              <div className="h-5 w-16 bg-border rounded-full" />
              <div className="h-4 w-20 bg-border rounded" />
              <div className="h-7 w-28 bg-border rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
