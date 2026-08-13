import type { EventSummary, EventTag, Helper, Shift } from '../types';
import { dateRange, formatDayLabel, formatTime, groupShiftsByDay } from '../format/schedule';

export interface ScheduleExportInput {
  event: EventSummary;
  tags: EventTag[];
  shifts: Shift[];
  helpers: Helper[];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Pure function: turns already-loaded event/shift/helper data into a
 * complete, self-contained HTML document (no external fonts/images/scripts)
 * suitable both for a native WebView PDF render (expo-print) and a web
 * print iframe — see exportSchedulePdf.ts for how each platform uses this.
 */
export function buildScheduleHtml(input: ScheduleExportInput): string {
  const { event, tags, shifts, helpers } = input;
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? '';
  const helperName = (id: string) => helpers.find((h) => h.id === id)?.name ?? '';

  const days = dateRange(event.startDate, event.endDate);
  const groups = groupShiftsByDay(shifts);
  const shiftsByDay = new Map(groups.map((g) => [g.key, g.shifts]));

  const daysHtml = days
    .map((day) => {
      const dayShifts = shiftsByDay.get(day) ?? [];
      const rowsHtml = dayShifts.length
        ? dayShifts
            .map(
              (shift) => `
        <tr>
          <td class="time">${formatTime(shift.startTime)}–${formatTime(shift.endTime)}</td>
          <td>
            <div class="shift-name">${escapeHtml(shift.name)}</div>
            <div class="shift-sub">${escapeHtml(tagName(shift.tagId))} · ${escapeHtml(shift.description)}</div>
          </td>
          <td class="assigned">${
            shift.assignedHelperIds.length
              ? escapeHtml(shift.assignedHelperIds.map(helperName).join(', '))
              : '<span class="unassigned">Unbesetzt</span>'
          }</td>
        </tr>`
            )
            .join('')
        : `<tr><td colspan="3" class="empty">Keine Schichten geplant</td></tr>`;
      return `
      <h2>${escapeHtml(formatDayLabel(day))}</h2>
      <table>
        <tbody>${rowsHtml}</tbody>
      </table>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<title>Schichtplan – ${escapeHtml(event.name)}</title>
<style>
  @page { margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, system-ui, "Segoe UI", Arial, sans-serif;
    color: #1a1a1a;
    margin: 0;
    padding: 0 8px;
  }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { font-size: 13px; color: #555; margin: 0 0 20px; }
  h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: #444;
    border-bottom: 1px solid #999;
    padding-bottom: 4px;
    margin: 18px 0 8px;
  }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  tr { page-break-inside: avoid; }
  td { padding: 6px 4px; border-bottom: 1px solid #ddd; vertical-align: top; font-size: 12.5px; }
  td.time { width: 90px; font-weight: 600; white-space: nowrap; }
  .shift-name { font-weight: 600; }
  .shift-sub { color: #555; margin-top: 1px; }
  td.assigned { width: 200px; text-align: right; }
  .unassigned { color: #a33; font-weight: 600; }
  .empty { color: #777; font-style: italic; }
</style>
</head>
<body>
  <h1>Schichtplan – ${escapeHtml(event.name)}</h1>
  <div class="subtitle">${escapeHtml(formatDayLabel(event.startDate))} – ${escapeHtml(formatDayLabel(event.endDate))}</div>
  ${daysHtml}
</body>
</html>`;
}
