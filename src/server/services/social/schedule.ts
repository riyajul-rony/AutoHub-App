import { DateTime } from "luxon";

export type ScheduleCampaign = {
  postTimes: string[]; // "HH:mm"
  daysOfWeek: number[]; // 0 = Sunday ... 6 = Saturday
  timezone: string; // IANA
  startDate?: string | null; // "YYYY-MM-DD"
  endDate?: string | null;
};

export const MISSED_RUN_GRACE_HOURS = 6;

/** luxon weekday: 1 = Mon .. 7 = Sun  ->  spec: 0 = Sun .. 6 = Sat */
function specWeekday(dt: DateTime): number {
  return dt.weekday % 7;
}

/**
 * Returns the UTC instants at which posts are due within (from, to].
 * Computation happens in the campaign's IANA timezone so DST shifts are handled by luxon.
 * Non-existent local times (spring-forward gaps) are shifted forward by luxon.
 */
export function computeDueRuns(c: ScheduleCampaign, from: Date, to: Date): Date[] {
  const zone = c.timezone;
  const start = DateTime.fromJSDate(from, { zone }).startOf("day").minus({ days: 1 });
  const end = DateTime.fromJSDate(to, { zone }).endOf("day").plus({ days: 1 });
  const out = new Map<number, Date>();

  for (let day = start; day <= end; day = day.plus({ days: 1 })) {
    if (!c.daysOfWeek.includes(specWeekday(day))) continue;
    const dateStr = day.toISODate()!;
    if (c.startDate && dateStr < c.startDate) continue;
    if (c.endDate && dateStr > c.endDate) continue;
    for (const t of c.postTimes) {
      const [h, m] = t.split(":").map(Number);
      const at = day.set({ hour: h, minute: m, second: 0, millisecond: 0 });
      if (!at.isValid) continue;
      const ms = at.toMillis();
      if (ms > from.getTime() && ms <= to.getTime()) out.set(ms, new Date(ms));
    }
  }
  return [...out.values()].sort((a, b) => a.getTime() - b.getTime());
}

/** Planner window: runs due now or within the next minute. */
export function computePlannerRuns(c: ScheduleCampaign, now: Date, lastPlannedUntil?: Date): {
  due: Date[];
  missed: Date[];
} {
  const lookahead = new Date(now.getTime() + 60_000);
  const graceStart = new Date(now.getTime() - MISSED_RUN_GRACE_HOURS * 3600_000);
  const from = lastPlannedUntil && lastPlannedUntil > graceStart ? lastPlannedUntil : graceStart;
  const all = computeDueRuns(c, from, lookahead);
  return { due: all, missed: [] };
}

/** Runs older than the grace window must be recorded as skipped (reason: missed). */
export function isMissed(scheduledFor: Date, now: Date): boolean {
  return now.getTime() - scheduledFor.getTime() > MISSED_RUN_GRACE_HOURS * 3600_000;
}
