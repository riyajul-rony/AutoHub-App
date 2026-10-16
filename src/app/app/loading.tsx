import React from "react";
import { Skeleton, Card } from "@/components/ui";

export default function AppLoading() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2 pb-5 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* 4 Cards Skeleton */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="w-9 h-9 rounded-[6px]" />
              <Skeleton className="w-4 h-4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
            <div className="pt-2 flex gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </Card>
        ))}
      </div>

      {/* 3 Quick Stats Skeleton */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-4 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-7 w-1/3" />
          </Card>
        ))}
      </div>
    </div>
  );
}
