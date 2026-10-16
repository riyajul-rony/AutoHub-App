"use client";

import React, { useState } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { QueueOverview } from "@/server/queues/manager";
import { toggleQueuePauseAction } from "./job-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function QueueCard({ queue }: { queue: QueueOverview }) {
  const [loading, setLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(queue.isPaused);

  const handleToggle = async () => {
    const nextState = !isPaused;
    setLoading(true);
    try {
      const res = await toggleQueuePauseAction(queue.name, nextState);
      if (res.success) {
        setIsPaused(nextState);
      } else {
        alert(res.error || "Failed to update queue state");
      }
    } catch (err: any) {
      alert(err.message || "Failed to toggle queue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`rounded-xl border bg-surface p-5 transition flex flex-col justify-between ${
        isPaused
          ? "border-amber-300 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20"
          : "border-border hover:border-border-input"
      }`}
    >
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h4 className="font-semibold text-sm text-fg">{queue.displayName}</h4>
            <span className="text-[11px] font-mono text-muted">{queue.name}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {isPaused ? (
              <Badge variant="warning" className="text-[10px]">
                Paused
              </Badge>
            ) : (
              <Badge variant="success" className="text-[10px]">
                Active
              </Badge>
            )}

            <Button
              onClick={handleToggle}
              disabled={loading}
              variant="ghost"
              size="sm"
              className={`!p-1.5 text-xs rounded-lg transition ${
                isPaused
                  ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  : "text-muted hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
              }`}
              title={isPaused ? "Resume Queue" : "Pause Queue"}
            >
              {loading ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isPaused ? (
                <Play size={13} />
              ) : (
                <Pause size={13} />
              )}
            </Button>
          </div>
        </div>

        {/* Counter Grid */}
        <div className="grid grid-cols-4 gap-2 my-4 text-center">
          <div className="p-2 rounded-lg bg-bgSubtle border border-border">
            <div className="text-[10px] text-muted uppercase font-medium">Waiting</div>
            <div className="text-base font-bold text-sky-600 dark:text-sky-400 font-mono mt-0.5">{queue.waiting}</div>
          </div>
          <div className="p-2 rounded-lg bg-bgSubtle border border-border">
            <div className="text-[10px] text-muted uppercase font-medium">Active</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{queue.active}</div>
          </div>
          <div className="p-2 rounded-lg bg-bgSubtle border border-border">
            <div className="text-[10px] text-muted uppercase font-medium">Done</div>
            <div className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{queue.completed}</div>
          </div>
          <div className="p-2 rounded-lg bg-bgSubtle border border-border">
            <div className="text-[10px] text-muted uppercase font-medium">Failed</div>
            <div className={`text-base font-bold font-mono mt-0.5 ${queue.failed > 0 ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
              {queue.failed}
            </div>
          </div>
        </div>
      </div>

      <div className="text-[11px] text-muted flex items-center justify-between pt-2.5 border-t border-border">
        <span>Delayed: {queue.delayed}</span>
        <span className="font-medium text-emerald-600 dark:text-emerald-400">Worker Live</span>
      </div>
    </div>
  );
}
