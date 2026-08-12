import * as seed from '../mock/data';
import type {
  EventSummary,
  EventTag,
  Helper,
  NewEventInput,
  NewHelperInput,
  NewShiftInput,
  RoleTag,
  Shift,
} from '../types';

// In-memory mutable copies of the seed data — this is the local-dev fallback
// used whenever no Supabase project is configured (see src/shared/data/api.ts).
let events: EventSummary[] = seed.events.map((e) => ({ ...e }));
let eventTags: EventTag[] = seed.eventTags.map((t) => ({ ...t }));
let helpers: Helper[] = seed.helpers.map((h) => ({ ...h, tags: [...h.tags] }));
const roleTags: RoleTag[] = seed.roleTags.map((r) => ({ ...r }));
let shifts: Shift[] = seed.shifts.map((s) => ({ ...s, assignedHelperIds: [...s.assignedHelperIds] }));

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

function delay<T>(value: T): Promise<T> {
  // small artificial latency so loading states are exercised even w/o Supabase
  return new Promise((resolve) => setTimeout(() => resolve(value), 40));
}

export const mockBackend = {
  listEvents: () => delay([...events]),
  listEventTags: (eventId: string) => delay(eventTags.filter((t) => t.eventId === eventId)),
  listHelpers: () => delay([...helpers]),
  listRoleTags: () => delay([...roleTags]),
  listShifts: (eventId: string) => delay(shifts.filter((s) => s.eventId === eventId)),

  createEvent: (input: NewEventInput) => {
    const event: EventSummary = { id: nextId('ev'), ablaufplan: '', ...input };
    events = [...events, event];
    eventTags = [
      ...eventTags,
      ...seed.DEFAULT_TAGS.map((name, i) => ({ id: nextId('tag'), eventId: event.id, name, sortOrder: i })),
    ];
    return delay(event);
  },

  updateEvent: (id: string, patch: Partial<Pick<EventSummary, 'name' | 'startDate' | 'endDate' | 'ablaufplan'>>) => {
    events = events.map((e) => (e.id === id ? { ...e, ...patch } : e));
    const updated = events.find((e) => e.id === id);
    if (!updated) throw new Error('Event not found');
    return delay(updated);
  },

  createEventTag: (eventId: string, name: string) => {
    const sortOrder = eventTags.filter((t) => t.eventId === eventId).length;
    const tag: EventTag = { id: nextId('tag'), eventId, name, sortOrder };
    eventTags = [...eventTags, tag];
    return delay(tag);
  },

  renameEventTag: (id: string, name: string) => {
    eventTags = eventTags.map((t) => (t.id === id ? { ...t, name } : t));
    const updated = eventTags.find((t) => t.id === id);
    if (!updated) throw new Error('Tag not found');
    return delay(updated);
  },

  deleteEventTag: (id: string) => {
    const usage = shifts.filter((s) => s.tagId === id).length;
    if (usage > 0) return Promise.reject(new Error(`Spalte wird noch von ${usage} Schicht(en) verwendet.`));
    eventTags = eventTags.filter((t) => t.id !== id);
    return delay(undefined);
  },

  tagUsageCount: (id: string) => delay(shifts.filter((s) => s.tagId === id).length),

  createShift: (input: NewShiftInput) => {
    const shift: Shift = { id: nextId('s'), assignedHelperIds: [], ...input };
    shifts = [...shifts, shift];
    return delay(shift);
  },

  updateShift: (id: string, patch: Partial<NewShiftInput>) => {
    shifts = shifts.map((s) => (s.id === id ? { ...s, ...patch } : s));
    const updated = shifts.find((s) => s.id === id);
    if (!updated) throw new Error('Shift not found');
    return delay(updated);
  },

  deleteShift: (id: string) => {
    shifts = shifts.filter((s) => s.id !== id);
    return delay(undefined);
  },

  assignHelper: (shiftId: string, helperId: string) => {
    shifts = shifts.map((s) =>
      s.id === shiftId && !s.assignedHelperIds.includes(helperId)
        ? { ...s, assignedHelperIds: [...s.assignedHelperIds, helperId] }
        : s
    );
    return delay(undefined);
  },

  unassignHelper: (shiftId: string, helperId: string) => {
    shifts = shifts.map((s) =>
      s.id === shiftId ? { ...s, assignedHelperIds: s.assignedHelperIds.filter((id) => id !== helperId) } : s
    );
    return delay(undefined);
  },

  createHelper: (input: NewHelperInput) => {
    const helper: Helper = { id: nextId('h'), ...input };
    helpers = [...helpers, helper];
    return delay(helper);
  },
};
