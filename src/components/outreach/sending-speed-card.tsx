"use client";

import React, { useMemo } from "react";
import { Zap, ShieldCheck, Gauge, AlertCircle, Info, Sparkles } from "lucide-react";
import { InfoTooltip } from "./info-tooltip";

export interface SendingSpeedValues {
  dailyLimit: number;
  minWaitMinutes: number;
  maxWaitMinutes: number;
}

export type SpeedPresetKey = "safe" | "balanced" | "fast";

export const SPEED_PRESETS: Record<
  SpeedPresetKey,
  {
    name: string;
    description: string;
    dailyLimit: number;
    minWaitMinutes: number;
    maxWaitMinutes: number;
  }
> = {
  safe: {
    name: "Safe",
    description: "Best for new inboxes (5-10m wait, up to 12/hr)",
    dailyLimit: 40,
    minWaitMinutes: 5,
    maxWaitMinutes: 10,
  },
  balanced: {
    name: "Balanced",
    description: "Recommended for healthy inboxes (3-6m wait, up to 20/hr)",
    dailyLimit: 75,
    minWaitMinutes: 3,
    maxWaitMinutes: 6,
  },
  fast: {
    name: "Fast",
    description: "Maximum safe speed (2.5-4m wait, up to 24/hr)",
    dailyLimit: 120,
    minWaitMinutes: 2.5,
    maxWaitMinutes: 4,
  },
};

interface SendingSpeedCardProps {
  dailyLimit: number;
  minWaitMinutes: number;
  maxWaitMinutes: number;
  planMaxHourlyLimit?: number;
  onChange: (values: SendingSpeedValues) => void;
  compact?: boolean;
  showPresets?: boolean;
  onApplyToAll?: () => void;
  className?: string;
}

export function SendingSpeedCard({
  dailyLimit,
  minWaitMinutes,
  maxWaitMinutes,
  planMaxHourlyLimit = 25,
  onChange,
  compact = false,
  showPresets = true,
  onApplyToAll,
  className = "",
}: SendingSpeedCardProps) {
  // Calculated max per hour based on shortest wait time: floor(60 / minWaitMinutes)
  const calculatedMaxPerHour = useMemo(() => {
    const validMin = Math.max(0.5, Number(minWaitMinutes) || 1);
    return Math.floor(60 / validMin);
  }, [minWaitMinutes]);

  const exceedsPlanCap = calculatedMaxPerHour > planMaxHourlyLimit;

  // Active preset detection
  const activePresetKey = useMemo<SpeedPresetKey | null>(() => {
    for (const [key, p] of Object.entries(SPEED_PRESETS) as [SpeedPresetKey, any][]) {
      if (
        p.dailyLimit === dailyLimit &&
        Math.abs(p.minWaitMinutes - minWaitMinutes) < 0.1 &&
        Math.abs(p.maxWaitMinutes - maxWaitMinutes) < 0.1
      ) {
        return key;
      }
    }
    return null;
  }, [dailyLimit, minWaitMinutes, maxWaitMinutes]);

  const handlePresetSelect = (presetKey: SpeedPresetKey) => {
    const p = SPEED_PRESETS[presetKey];
    onChange({
      dailyLimit: p.dailyLimit,
      minWaitMinutes: p.minWaitMinutes,
      maxWaitMinutes: p.maxWaitMinutes,
    });
  };

  const handleDailyLimitChange = (newLimit: number) => {
    const clamped = Math.min(Math.max(Number(newLimit) || 10, 5), 500);
    onChange({
      dailyLimit: clamped,
      minWaitMinutes,
      maxWaitMinutes,
    });
  };

  const handleWaitMinutesChange = (newMin: number, newMax: number) => {
    const validMin = Math.max(0.5, Number(newMin) || 1);
    const validMax = Math.max(validMin, Number(newMax) || validMin);
    onChange({
      dailyLimit,
      minWaitMinutes: validMin,
      maxWaitMinutes: validMax,
    });
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-xl border border-border/70 bg-surface/50 text-xs space-y-2.5 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-fg flex items-center gap-1.5">
            <Gauge size={13} className="text-primary" /> Sending Speed
          </span>
          <span className="text-[11px] font-mono text-muted">
            Max: <strong className={exceedsPlanCap ? "text-amber-500" : "text-fg"}>{calculatedMaxPerHour}/hr</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-muted block mb-0.5">Daily Limit</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={5}
                max={500}
                value={dailyLimit}
                onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
                className="input h-7 text-xs w-full font-mono px-2"
              />
              <span className="text-[10px] text-muted">/day</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted block mb-0.5">Wait Gap</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="60"
                value={minWaitMinutes}
                onChange={(e) => handleWaitMinutesChange(Number(e.target.value), maxWaitMinutes)}
                className="input h-7 text-xs w-12 font-mono px-1.5 text-center"
              />
              <span className="text-muted">–</span>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="60"
                value={maxWaitMinutes}
                onChange={(e) => handleWaitMinutesChange(minWaitMinutes, Number(e.target.value))}
                className="input h-7 text-xs w-12 font-mono px-1.5 text-center"
              />
              <span className="text-[10px] text-muted">min</span>
            </div>
          </div>
        </div>

        {exceedsPlanCap && (
          <div className="text-[10px] text-amber-500 flex items-center gap-1">
            <AlertCircle size={10} className="shrink-0" />
            <span>Shortest wait ({minWaitMinutes}m) exceeds 25/hr limit; system caps at 25/hr.</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-xl border border-border bg-surface shadow-xs space-y-4 ${className}`}>
      {/* Header & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/70">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Gauge size={15} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-sm font-semibold text-fg">Sending Speed &amp; Safety</h4>
              <InfoTooltip
                title="Why speed pacing matters"
                content="Spreading your emails naturally throughout the day prevents spam filters from flagging your domain. Safe pacing ensures your emails land in the primary inbox."
              />
            </div>
            <p className="text-[11px] text-muted">
              Controls daily email volume and random wait gaps to safeguard sender inbox reputation.
            </p>
          </div>
        </div>

        {showPresets && (
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            {(Object.keys(SPEED_PRESETS) as SpeedPresetKey[]).map((key) => {
              const preset = SPEED_PRESETS[key];
              const isSelected = activePresetKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePresetSelect(key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-bgSubtle text-muted hover:text-fg hover:bg-surfaceHover border border-border"
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Control 1: Daily Limit Stepper & Slider */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <label className="font-medium text-fg flex items-center gap-1.5">
            <span>Send up to</span>
            <span className="font-semibold text-primary">{dailyLimit} emails per day</span>
            <InfoTooltip
              title="Daily Sending Limit"
              content="Total emails this inbox will dispatch per day. For new inboxes, start with 10–25/day. For aged accounts, 50–100/day is recommended."
            />
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleDailyLimitChange(dailyLimit - 10)}
              className="w-6 h-6 rounded border border-border bg-bgSubtle hover:bg-surfaceHover text-fg flex items-center justify-center font-bold text-xs"
            >
              -
            </button>
            <input
              type="number"
              min={5}
              max={500}
              step={5}
              value={dailyLimit}
              onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
              className="input h-6 w-16 text-xs text-center font-mono px-1"
            />
            <button
              type="button"
              onClick={() => handleDailyLimitChange(dailyLimit + 10)}
              className="w-6 h-6 rounded border border-border bg-bgSubtle hover:bg-surfaceHover text-fg flex items-center justify-center font-bold text-xs"
            >
              +
            </button>
          </div>
        </div>

        {/* Range Slider */}
        <input
          type="range"
          min={10}
          max={300}
          step={5}
          value={dailyLimit}
          onChange={(e) => handleDailyLimitChange(Number(e.target.value))}
          className="w-full accent-primary h-1.5 bg-bgSubtle rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted">
          <span>10 (Slow start for new inboxes)</span>
          <span>75 (Recommended)</span>
          <span>150</span>
          <span>300 (High Volume)</span>
        </div>
      </div>

      {/* Control 2: Random Human Delay Between Emails */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-medium text-fg flex items-center gap-1.5">
          <span>Random human delay between emails:</span>
          <InfoTooltip
            title="Random Wait Pacing"
            content="Sending emails with varying random intervals (e.g. 3–6 minutes) mimics real human sending behavior, keeping your inbox safe from automated spam detection."
          />
        </label>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted">Wait</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="60"
              value={minWaitMinutes}
              onChange={(e) => handleWaitMinutesChange(Number(e.target.value), maxWaitMinutes)}
              className="input h-8 w-16 text-xs text-center font-mono"
            />
            <span className="text-muted">to</span>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="60"
              value={maxWaitMinutes}
              onChange={(e) => handleWaitMinutesChange(minWaitMinutes, Number(e.target.value))}
              className="input h-8 w-16 text-xs text-center font-mono"
            />
            <span className="text-muted">minutes</span>
          </div>
          <span className="text-[11px] text-muted italic">
            (system automatically randomizes wait time within this range before next email)
          </span>
        </div>
      </div>

      {/* Control 3: Calculated Max Per Hour with Safe Speed Badge */}
      <div className="p-3 rounded-lg bg-bgSubtle border border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-muted">Calculated Speed:</span>
            <span className="font-semibold text-fg font-mono">
              ~{calculatedMaxPerHour} emails / hour max
            </span>
            <span className="badge text-[10px]">Read-only</span>
            <InfoTooltip
              title="Hourly Speed Calculation"
              content="Calculated from your shortest wait time (60 min / min wait). Lead Reach AI strictly enforces a hard cap of 25 emails/hour per sender inbox to protect deliverability."
            />
          </div>
          <p className="text-[11px] text-muted">
            Computed from shortest wait time ({minWaitMinutes}m = 60 / {minWaitMinutes}).
          </p>
        </div>

        {exceedsPlanCap ? (
          <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-500 text-[11px] flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" />
            <span>Exceeds safe speed limit of {planMaxHourlyLimit}/hr. Auto-capped at {planMaxHourlyLimit}/hr.</span>
          </div>
        ) : (
          <div className="text-emerald-600 dark:text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
            <ShieldCheck size={13} className="shrink-0" />
            <span>Safe within {planMaxHourlyLimit}/hr speed limit</span>
          </div>
        )}
      </div>

      {/* Optional: Apply to all accounts button */}
      {onApplyToAll && (
        <div className="pt-1 flex justify-end">
          <button
            type="button"
            onClick={onApplyToAll}
            className="btn btn-secondary text-xs h-7 px-3 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={12} className="text-primary" />
            <span>Apply this speed to all accounts</span>
          </button>
        </div>
      )}
    </div>
  );
}
