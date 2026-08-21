/**
 * Calendar dates for every camp week, keyed by week id.
 *
 * These drive the "already happened" state: a week greys out and stops
 * accepting signups once it has started, so families can only buy weeks that
 * are still ahead. Keep `start`/`end` in sync with the `label` in
 * `LocationContext.tsx` — the label is what's shown, this is what's compared.
 *
 * Dates are plain local calendar days ("YYYY-MM-DD"), never UTC timestamps.
 */
export const WEEK_SCHEDULE: Record<string, { start: string; end: string }> = {
  'lex-wk1': { start: '2026-07-27', end: '2026-07-31' }, // July 27–31, 2026
  'lex-wk2': { start: '2026-08-03', end: '2026-08-07' }, // August 3–7, 2026
  'lex-wk3': { start: '2026-08-10', end: '2026-08-14' }, // August 10–14, 2026
  'lex-wk4': { start: '2026-08-17', end: '2026-08-21' }, // August 17–21, 2026
  'lex-wk5': { start: '2026-08-24', end: '2026-08-28' }, // August 24–28, 2026
  'nw-wk2': { start: '2026-08-17', end: '2026-08-21' }, // Newton: August 17–21, 2026
  'way-wk1': { start: '2026-08-03', end: '2026-08-07' }, // Wayland: August 3–7, 2026
};

export type WeekStatus = 'upcoming' | 'in-progress' | 'past';

/** Parse "YYYY-MM-DD" as local midnight (`new Date(str)` would read it as UTC). */
function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Where a week sits relative to today. A week with no entry in
 * `WEEK_SCHEDULE` is treated as `upcoming` — an unknown week stays bookable
 * rather than silently disappearing from the page.
 */
export function getWeekStatus(weekId: string, now: Date = new Date()): WeekStatus {
  const schedule = WEEK_SCHEDULE[weekId];
  if (!schedule) return 'upcoming';

  const today = startOfDay(now);
  if (today > parseLocalDate(schedule.end)) return 'past';
  // Signups close the morning camp starts — you can't join a week already underway.
  if (today >= parseLocalDate(schedule.start)) return 'in-progress';
  return 'upcoming';
}

/** True once a week has started, i.e. it can no longer be signed up for. */
export function isWeekClosed(weekId: string, now: Date = new Date()): boolean {
  return getWeekStatus(weekId, now) !== 'upcoming';
}
