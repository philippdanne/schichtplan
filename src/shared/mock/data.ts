import type { EventSummary, EventTag, Helper, RoleTag, Shift } from '../types';

// Seed data ported from the Claude Design click-prototype
// (design/project/Schichtplaner.dc.html). Used as the local-dev fallback
// when no Supabase project is configured (see src/shared/data/api.ts) and
// as the baseline the real schema in supabase/migrations was modeled on.

export const DEFAULT_TAGS = ['Zapfen', 'Kellnern', 'Wertmarkenverkauf'];

export const roleTags: RoleTag[] = [
  { id: 'vorstand', name: 'Vorstand', color: '#C2673A' },
  { id: 'freiwillig', name: 'Freiw. Helfer', color: '#3B9C8C' },
];

export const helpers: Helper[] = [
  { id: 'h1', name: 'Anna Bauer', tags: ['Zapfen'], roleTagId: 'freiwillig', availability: null },
  { id: 'h2', name: 'Björn Krüger', tags: ['Kellnern'], roleTagId: 'vorstand', availability: null },
  { id: 'h3', name: 'Christine Voss', tags: ['Wertmarkenverkauf'], roleTagId: 'freiwillig', availability: null },
  { id: 'h4', name: 'Dennis Schmitt', tags: ['Zapfen', 'Kellnern'], roleTagId: 'freiwillig', availability: null },
  { id: 'h5', name: 'Elke Radtke', tags: ['Kellnern'], roleTagId: 'freiwillig', availability: null },
  {
    id: 'h6',
    name: 'Frank Ostermann',
    tags: ['Zapfen'],
    roleTagId: 'freiwillig',
    availability: ['schuetzenfest:2026-08-14', 'schuetzenfest:2026-08-15'],
  },
  { id: 'h7', name: 'Greta Lindemann', tags: ['Wertmarkenverkauf'], roleTagId: 'freiwillig', availability: null },
  { id: 'h8', name: 'Hannes Peters', tags: ['Kellnern'], roleTagId: 'freiwillig', availability: null },
  { id: 'h9', name: 'Inga Marquardt', tags: ['Zapfen', 'Wertmarkenverkauf'], roleTagId: 'vorstand', availability: null },
  { id: 'h10', name: 'Jonas Wiechert', tags: ['Kellnern'], roleTagId: 'freiwillig', availability: null },
  { id: 'h11', name: 'Karin Sellmann', tags: ['Zapfen'], roleTagId: 'freiwillig', availability: null },
  { id: 'h12', name: 'Lukas Nowak', tags: ['Kellnern', 'Zapfen'], roleTagId: 'freiwillig', availability: null },
  {
    id: 'h13',
    name: 'Marie Thelen',
    tags: ['Wertmarkenverkauf'],
    roleTagId: 'freiwillig',
    availability: ['jubel:2026-08-22', 'jubel:2026-08-23'],
  },
  { id: 'h14', name: 'Niklas Brandt', tags: ['Zapfen'], roleTagId: 'freiwillig', availability: null },
];

export const events: EventSummary[] = [
  { id: 'schuetzenfest', name: 'Schützenfest', startDate: '2026-08-14', endDate: '2026-08-16', ablaufplan: '' },
  { id: 'jubel', name: 'Jubelschützenfest', startDate: '2026-08-22', endDate: '2026-08-23', ablaufplan: '' },
];

export const eventTags: EventTag[] = events.flatMap((ev) =>
  DEFAULT_TAGS.map((name, i) => ({ id: `${ev.id}-${name}`, eventId: ev.id, name, sortOrder: i }))
);

const DESC: Record<string, string> = {
  'Zapfen Bierwagen 1': 'Ausschank am großen Bierwagen',
  'Zapfen Bierwagen 2': 'Ausschank am kleinen Bierwagen',
  'Bedienung Festzelt': 'Getränke & Speisen im Festzelt',
  'Bedienung Biergarten': 'Service im Biergarten',
  'Kasse Haupteingang': 'Wertmarkenverkauf am Haupteingang',
  'Kasse Seiteneingang': 'Wertmarkenverkauf am Seiteneingang',
};

function dt(date: string, time: string): string {
  return `${date}T${time}:00`;
}

function mkShift(
  id: string,
  eventId: string,
  tagName: string,
  name: string,
  date: string,
  start: string,
  end: string,
  assigned: string[]
): Shift {
  return {
    id,
    eventId,
    tagId: `${eventId}-${tagName}`,
    name,
    description: DESC[name] ?? '',
    startTime: dt(date, start),
    endTime: dt(date, end),
    assignedHelperIds: assigned,
  };
}

let n = 0;
const next = () => `s${n++}`;

export const shifts: Shift[] = [
  // Schützenfest — Fr 14.8.
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 1', '2026-08-14', '17:00', '21:00', ['h1']),
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 2', '2026-08-14', '19:00', '23:00', []),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Festzelt', '2026-08-14', '18:00', '22:00', ['h2', 'h4']),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Biergarten', '2026-08-14', '17:00', '20:00', ['h5']),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Haupteingang', '2026-08-14', '16:00', '20:00', ['h3']),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Seiteneingang', '2026-08-14', '18:00', '22:00', []),
  // Schützenfest — Sa 15.8.
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 1', '2026-08-15', '12:00', '16:00', ['h6']),
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 2', '2026-08-15', '16:00', '20:00', ['h1', 'h9']),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Festzelt', '2026-08-15', '12:00', '16:00', ['h8']),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Biergarten', '2026-08-15', '16:00', '20:00', []),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Haupteingang', '2026-08-15', '11:00', '15:00', ['h3']),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Seiteneingang', '2026-08-15', '15:00', '19:00', ['h13']),
  // Schützenfest — So 16.8.
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 1', '2026-08-16', '10:00', '13:00', ['h9']),
  mkShift(next(), 'schuetzenfest', 'Zapfen', 'Zapfen Bierwagen 2', '2026-08-16', '13:00', '16:00', []),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Festzelt', '2026-08-16', '10:00', '14:00', ['h2']),
  mkShift(next(), 'schuetzenfest', 'Kellnern', 'Bedienung Biergarten', '2026-08-16', '11:00', '14:00', ['h5', 'h12']),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Haupteingang', '2026-08-16', '10:00', '13:00', ['h7']),
  mkShift(next(), 'schuetzenfest', 'Wertmarkenverkauf', 'Kasse Seiteneingang', '2026-08-16', '12:00', '15:00', []),
  // Jubelschützenfest — Sa 22.8.
  mkShift(next(), 'jubel', 'Zapfen', 'Zapfen Bierwagen 1', '2026-08-22', '17:00', '21:00', ['h4']),
  mkShift(next(), 'jubel', 'Zapfen', 'Zapfen Bierwagen 2', '2026-08-22', '19:00', '23:00', ['h6']),
  mkShift(next(), 'jubel', 'Kellnern', 'Bedienung Festzelt', '2026-08-22', '18:00', '22:00', ['h11']),
  mkShift(next(), 'jubel', 'Kellnern', 'Bedienung Biergarten', '2026-08-22', '17:00', '20:00', []),
  mkShift(next(), 'jubel', 'Wertmarkenverkauf', 'Kasse Haupteingang', '2026-08-22', '16:00', '20:00', ['h3']),
  mkShift(next(), 'jubel', 'Wertmarkenverkauf', 'Kasse Seiteneingang', '2026-08-22', '18:00', '22:00', ['h14']),
  // Jubelschützenfest — So 23.8.
  mkShift(next(), 'jubel', 'Zapfen', 'Zapfen Bierwagen 1', '2026-08-23', '10:00', '13:00', []),
  mkShift(next(), 'jubel', 'Zapfen', 'Zapfen Bierwagen 2', '2026-08-23', '13:00', '16:00', ['h1']),
  mkShift(next(), 'jubel', 'Kellnern', 'Bedienung Festzelt', '2026-08-23', '10:00', '14:00', ['h8', 'h2']),
  mkShift(next(), 'jubel', 'Kellnern', 'Bedienung Biergarten', '2026-08-23', '11:00', '14:00', []),
  mkShift(next(), 'jubel', 'Wertmarkenverkauf', 'Kasse Haupteingang', '2026-08-23', '10:00', '13:00', ['h13']),
  mkShift(next(), 'jubel', 'Wertmarkenverkauf', 'Kasse Seiteneingang', '2026-08-23', '12:00', '15:00', ['h7']),
];
