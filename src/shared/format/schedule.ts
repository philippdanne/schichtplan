import type { Shift } from '../types';

// Shared by the Admin timeline, the Helfer read-only list, and the PDF
// export template — all three need the same day grouping/labeling, so it
// lives here once instead of being copy-pasted per screen.

export const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

export function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}. ${d.toLocaleDateString('de-DE', { month: 'short' })}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function dateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
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
