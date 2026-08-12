import { isSupabaseConfigured } from '../supabase/client';
import { mockBackend } from './mockBackend';
import { supabaseBackend } from './supabaseBackend';

// Single seam between the app and its data source. Every screen imports
// from here, never from mockBackend/supabaseBackend directly — that's what
// lets the Supabase migration happen table-by-table without touching UI
// code: flip a table's calls over to `supabaseBackend` here once its
// migration is verified, leaving the rest on `mockBackend`.
//
// Right now everything routes to Supabase when EXPO_PUBLIC_SUPABASE_URL /
// EXPO_PUBLIC_SUPABASE_ANON_KEY are set (see src/shared/supabase/client.ts),
// and otherwise falls back to the in-memory mock store so the app still runs
// with `npm run web` / `npm run ios` without any backend configured.
const backend = isSupabaseConfigured ? supabaseBackend : mockBackend;

export const api = {
  listEvents: backend.listEvents,
  listEventTags: backend.listEventTags,
  listHelpers: backend.listHelpers,
  listRoleTags: backend.listRoleTags,
  listShifts: backend.listShifts,
  createEvent: backend.createEvent,
  updateEvent: backend.updateEvent,
  createEventTag: backend.createEventTag,
  renameEventTag: backend.renameEventTag,
  deleteEventTag: backend.deleteEventTag,
  tagUsageCount: backend.tagUsageCount,
  getDaySettings: backend.getDaySettings,
  updateDaySettings: backend.updateDaySettings,
  createShift: backend.createShift,
  updateShift: backend.updateShift,
  deleteShift: backend.deleteShift,
  assignHelper: backend.assignHelper,
  unassignHelper: backend.unassignHelper,
  createHelper: backend.createHelper,
  subscribeShifts: isSupabaseConfigured ? supabaseBackend.subscribeShifts : () => () => {},
};
