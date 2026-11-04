import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string | number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  sparkline?: number[];
  icon?: React.ReactNode;
  className?: string;
  emptyHint?: string;
}

export function StatCard({
  label,
  value,
  trend,
  sparkline,
  icon,
  className = "",
  emptyHint,
}: StatCardProps) {
  // Simple SVG sparkline renderer
  const renderSparkline = (points: number[]) => {
    if (!points || points.length < 2) return null;
    const width = 64;
    const height = 20;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const polylinePoints = points
      .map((val, idx) => {
        const x = (idx / (points.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    return (
      <svg
        width={width}
        height={height}
        className="overflow-visible shrink-0 text-text-subtle/50"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />
      </svg>
    );
  };

  return (
    <div
      className={`rounded-[8px] border border-border bg-surface p-4 transition-colors duration-150 hover:border-borderStrong flex flex-col justify-between ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-muted truncate">{label}</span>
        {icon && <span className="text-text-subtle shrink-0">{icon}</span>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <div className="text-2xl font-bold font-mono tracking-tight text-text truncate">
          {value}
        </div>

        {trend && (
          <div
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              trend.direction === "up"
                ? "text-[var(--badge-success-text)]"
                : trend.direction === "down"
                ? "text-[var(--badge-danger-text)]"
                : "text-text-muted"
            }`}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight size={13} className="shrink-0" />
            ) : trend.direction === "down" ? (
              <ArrowDownRight size={13} className="shrink-0" />
            ) : (
              <Minus size={13} className="shrink-0" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-[10px] text-text-subtle ml-0.5">{trend.label}</span>}
          </div>
        )}

        {sparkline && renderSparkline(sparkline)}
      </div>

      {emptyHint && (
        <div className="mt-2 text-[11px] text-text-subtle">
          {emptyHint}
        </div>
      )}
    </div>
  );
}

StatCard.displayName = "StatCard";

