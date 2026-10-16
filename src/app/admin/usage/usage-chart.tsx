"use client";

import React, { useState } from "react";

export interface TimelineDataPoint {
  label: string; // e.g. "Oct 1", "Oct 2" or period
  leads: number;
  posts: number;
  emails: number;
}

interface UsageChartProps {
  timeline: TimelineDataPoint[];
  totalLeads: number;
  totalPosts: number;
  totalEmails: number;
}

export function UsageChart({
  timeline,
  totalLeads,
  totalPosts,
  totalEmails,
}: UsageChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const grandTotal = totalLeads + totalPosts + totalEmails || 1;
  const leadsShare = Math.round((totalLeads / grandTotal) * 100);
  const postsShare = Math.round((totalPosts / grandTotal) * 100);
  const emailsShare = Math.max(0, 100 - leadsShare - postsShare);

  // SVG Chart dimensions
  const width = 800;
  const height = 220;
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Calculate scale
  const maxVal = Math.max(
    ...timeline.map((d) => Math.max(d.leads, d.posts, d.emails)),
    10
  );

  const pointCount = timeline.length;
  const stepX = pointCount > 1 ? chartWidth / (pointCount - 1) : chartWidth;

  const getPoints = (key: "leads" | "posts" | "emails") => {
    return timeline
      .map((d, i) => {
        const x = paddingX + i * stepX;
        const y = paddingY + chartHeight - (d[key] / maxVal) * chartHeight;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const leadsPoints = getPoints("leads");
  const postsPoints = getPoints("posts");
  const emailsPoints = getPoints("emails");

  return (
    <div className="space-y-6">
      {/* Top Distribution Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-medium text-muted">
          <span>Global Resource Distribution (This Month)</span>
          <span>{grandTotal.toLocaleString()} total units consumed</span>
        </div>
        <div className="h-2.5 w-full rounded-full overflow-hidden bg-bgSubtle flex">
          <div
            style={{ width: `${leadsShare}%` }}
            className="h-full bg-sky-500 transition-all duration-500 hover:opacity-80"
            title={`Leads: ${totalLeads} (${leadsShare}%)`}
          />
          <div
            style={{ width: `${postsShare}%` }}
            className="h-full bg-pink-500 transition-all duration-500 hover:opacity-80"
            title={`Posts: ${totalPosts} (${postsShare}%)`}
          />
          <div
            style={{ width: `${emailsShare}%` }}
            className="h-full bg-purple-500 transition-all duration-500 hover:opacity-80"
            title={`Emails: ${totalEmails} (${emailsShare}%)`}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6 text-xs text-muted pt-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
            <span className="text-fg font-medium">Leads</span>
            <span>({leadsShare}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-pink-500" />
            <span className="text-fg font-medium">Social Posts</span>
            <span>({postsShare}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
            <span className="text-fg font-medium">Outreach Emails</span>
            <span>({emailsShare}%)</span>
          </div>
        </div>
      </div>

      {/* Pure SVG Timeline Chart */}
      <div className="relative w-full overflow-hidden rounded-xl bg-bgSubtle/40 p-4 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-fg">Daily Activity Trend</span>
          <span className="text-[11px] text-muted">Peak: {maxVal} events/day</span>
        </div>

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingY + chartHeight * ratio;
            const val = Math.round(maxVal * (1 - ratio));
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="currentColor"
                  opacity="0.6"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Lines */}
          <polyline
            fill="none"
            stroke="#0284c7"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={leadsPoints}
          />
          <polyline
            fill="none"
            stroke="#db2777"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={postsPoints}
          />
          <polyline
            fill="none"
            stroke="#9333ea"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={emailsPoints}
          />

          {/* Data points & hover triggers */}
          {timeline.map((d, i) => {
            const x = paddingX + i * stepX;
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={paddingY + chartHeight}
                    stroke="currentColor"
                    strokeOpacity="0.3"
                    strokeWidth="1.5"
                  />
                )}

                {/* Circles */}
                <circle
                  cx={x}
                  cy={paddingY + chartHeight - (d.leads / maxVal) * chartHeight}
                  r={isHovered ? 5 : 3}
                  fill="#0284c7"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={paddingY + chartHeight - (d.posts / maxVal) * chartHeight}
                  r={isHovered ? 5 : 3}
                  fill="#db2777"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />
                <circle
                  cx={x}
                  cy={paddingY + chartHeight - (d.emails / maxVal) * chartHeight}
                  r={isHovered ? 5 : 3}
                  fill="#9333ea"
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />

                {/* X-axis label */}
                <text
                  x={x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="10"
                  fill="currentColor"
                  opacity={isHovered ? 1 : 0.65}
                  fontWeight={isHovered ? "bold" : "normal"}
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Dynamic Tooltip */}
        {hoveredIdx !== null && timeline[hoveredIdx] && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-surface px-4 py-2 border border-border text-xs shadow-md">
            <span className="font-semibold text-fg">
              {timeline[hoveredIdx].label} Details:
            </span>
            <div className="flex items-center gap-4">
              <span className="text-sky-600 dark:text-sky-400 font-medium">
                Leads: {timeline[hoveredIdx].leads}
              </span>
              <span className="text-pink-600 dark:text-pink-400 font-medium">
                Posts: {timeline[hoveredIdx].posts}
              </span>
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                Emails: {timeline[hoveredIdx].emails}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
