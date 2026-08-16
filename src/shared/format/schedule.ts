import type { Shift } from '../types';

// Shared by the Admin timeline, the Helfer read-only list, and the PDF
// export template — all three need the same day grouping/labeling, so it
// lives here once instead of being copy-pasted per screen.

export const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

export function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
  const parts = formatter.formatToParts(d);
  const dayName = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const dayNum = parts.find((p) => p.type === 'day')?.value ?? '';
  const monthStr = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${dayName}, ${dayNum}. ${monthStr}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return formatter.format(d);
}

// cur.toISOString().slice(0, 10) would convert through UTC first, which
// shifts the date back a day in any timezone ahead of UTC (e.g. local
// midnight in CEST is still 22:00 the previous day in UTC) — read the
// local calendar fields directly instead.
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    out.push(toDateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

export interface DayGroup {
  key: string;
  label: string;
  shifts: Shift[];
}

export function groupShiftsByDay(shifts: Shift[]): DayGroup[] {
  const byDate = new Map<string, Shift[]>();
  for (const s of shifts) {
    const dateKey = s.startTime.slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(s);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayShifts]) => ({
      key: date,
      label: formatDayLabel(date),
      shifts: [...dayShifts].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    }));
}
