import type { Shift } from '../types';

// Shared by the Admin timeline, the Helfer read-only list, and the PDF
// export template — all three need the same day grouping/labeling, so it
// lives here once instead of being copy-pasted per screen.

export const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

export function formatDayLabel(iso: string): string {
<<<<<<< HEAD
  const d = new Date(iso);
  const formatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
  const parts = formatter.formatToParts(d);
  const dayName = parts.find((p) => p.type === 'weekday')?.value ?? '';
  const dayNum = parts.find((p) => p.type === 'day')?.value ?? '';
  const monthStr = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${dayName}, ${dayNum}. ${monthStr}`;
=======
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}. ${d.toLocaleDateString('de-DE', { month: 'short' })}`;
>>>>>>> 4658f3432298f213aa3f7dd94cd2e20ba214ffbf
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
<<<<<<< HEAD
  const formatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return formatter.format(d);
=======
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
>>>>>>> 4658f3432298f213aa3f7dd94cd2e20ba214ffbf
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
