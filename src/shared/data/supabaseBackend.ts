import { supabase } from '../supabase/client';
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
import { DEFAULT_TAGS } from '../mock/data';

function client() {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
}

function mapEvent(row: any): EventSummary {
  return { id: row.id, name: row.name, startDate: row.start_date, endDate: row.end_date, ablaufplan: row.ablaufplan ?? '' };
}

function mapEventTag(row: any): EventTag {
  return { id: row.id, eventId: row.event_id, name: row.name, sortOrder: row.sort_order };
}

function mapHelper(row: any): Helper {
  return { id: row.id, name: row.name, tags: row.tags ?? [], roleTagId: row.role_tag_id, availability: row.availability };
}

function mapRoleTag(row: any): RoleTag {
  return { id: row.id, name: row.name, color: row.color };
}

function mapShift(row: any): Shift {
  return {
    id: row.id,
    eventId: row.event_id,
    tagId: row.tag_id,
    name: row.name,
    description: row.description ?? '',
    startTime: row.start_time,
    endTime: row.end_time,
    assignedHelperIds: (row.shift_assignments ?? []).map((a: any) => a.helper_id),
  };
}

export const supabaseBackend = {
  async listEvents(): Promise<EventSummary[]> {
    const { data, error } = await client().from('events').select('*').order('start_date');
    if (error) throw error;
    return (data ?? []).map(mapEvent);
  },

  async listEventTags(eventId: string): Promise<EventTag[]> {
    const { data, error } = await client().from('event_tags').select('*').eq('event_id', eventId).order('sort_order');
    if (error) throw error;
    return (data ?? []).map(mapEventTag);
  },

  async listHelpers(): Promise<Helper[]> {
    const { data, error } = await client().from('helpers').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapHelper);
  },

  async listRoleTags(): Promise<RoleTag[]> {
    const { data, error } = await client().from('role_tags').select('*');
    if (error) throw error;
    return (data ?? []).map(mapRoleTag);
  },

  async listShifts(eventId: string): Promise<Shift[]> {
    const { data, error } = await client()
      .from('shifts')
      .select('*, shift_assignments(helper_id)')
      .eq('event_id', eventId)
      .order('start_time');
    if (error) throw error;
    return (data ?? []).map(mapShift);
  },

  async createEvent(input: NewEventInput): Promise<EventSummary> {
    const { data, error } = await client()
      .from('events')
      .insert({ name: input.name, start_date: input.startDate, end_date: input.endDate })
      .select()
      .single();
    if (error) throw error;
    const event = mapEvent(data);
    const { error: tagError } = await client()
      .from('event_tags')
      .insert(DEFAULT_TAGS.map((name, i) => ({ event_id: event.id, name, sort_order: i })));
    if (tagError) throw tagError;
    return event;
  },

  async updateEvent(
    id: string,
    patch: Partial<Pick<EventSummary, 'name' | 'startDate' | 'endDate' | 'ablaufplan'>>
  ): Promise<EventSummary> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.startDate !== undefined) row.start_date = patch.startDate;
    if (patch.endDate !== undefined) row.end_date = patch.endDate;
    if (patch.ablaufplan !== undefined) row.ablaufplan = patch.ablaufplan;
    const { data, error } = await client().from('events').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapEvent(data);
  },

  async createEventTag(eventId: string, name: string): Promise<EventTag> {
    const { count } = await client().from('event_tags').select('id', { count: 'exact', head: true }).eq('event_id', eventId);
    const { data, error } = await client()
      .from('event_tags')
      .insert({ event_id: eventId, name, sort_order: count ?? 0 })
      .select()
      .single();
    if (error) throw error;
    return mapEventTag(data);
  },

  async renameEventTag(id: string, name: string): Promise<EventTag> {
    const { data, error } = await client().from('event_tags').update({ name }).eq('id', id).select().single();
    if (error) throw error;
    return mapEventTag(data);
  },

  async deleteEventTag(id: string): Promise<void> {
    const usage = await supabaseBackend.tagUsageCount(id);
    if (usage > 0) throw new Error(`Spalte wird noch von ${usage} Schicht(en) verwendet.`);
    const { error } = await client().from('event_tags').delete().eq('id', id);
    if (error) throw error;
  },

  async tagUsageCount(id: string): Promise<number> {
    const { count, error } = await client().from('shifts').select('id', { count: 'exact', head: true }).eq('tag_id', id);
    if (error) throw error;
    return count ?? 0;
  },

  async getDaySettings(eventId: string, date: string): Promise<{ dayStart: string; dayEnd: string }> {
    const { data, error } = await client()
      .from('event_day_settings')
      .select('day_start, day_end')
      .eq('event_id', eventId)
      .eq('date', date)
      .maybeSingle();
    if (error) throw error;
    return { dayStart: data?.day_start?.slice(0, 5) ?? '10:00', dayEnd: data?.day_end?.slice(0, 5) ?? '00:00' };
  },

  async updateDaySettings(
    eventId: string,
    date: string,
    patch: { dayStart?: string; dayEnd?: string }
  ): Promise<{ dayStart: string; dayEnd: string }> {
    const current = await supabaseBackend.getDaySettings(eventId, date);
    const next = { ...current, ...patch };
    const { error } = await client()
      .from('event_day_settings')
      .upsert({ event_id: eventId, date, day_start: next.dayStart, day_end: next.dayEnd });
    if (error) throw error;
    return next;
  },

  async createShift(input: NewShiftInput): Promise<Shift> {
    const { data, error } = await client()
      .from('shifts')
      .insert({
        event_id: input.eventId,
        tag_id: input.tagId,
        name: input.name,
        description: input.description,
        start_time: input.startTime,
        end_time: input.endTime,
      })
      .select('*, shift_assignments(helper_id)')
      .single();
    if (error) throw error;
    return mapShift(data);
  },

  async updateShift(id: string, patch: Partial<NewShiftInput>): Promise<Shift> {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.description !== undefined) row.description = patch.description;
    if (patch.tagId !== undefined) row.tag_id = patch.tagId;
    if (patch.startTime !== undefined) row.start_time = patch.startTime;
    if (patch.endTime !== undefined) row.end_time = patch.endTime;
    const { data, error } = await client()
      .from('shifts')
      .update(row)
      .eq('id', id)
      .select('*, shift_assignments(helper_id)')
      .single();
    if (error) throw error;
    return mapShift(data);
  },

  async deleteShift(id: string): Promise<void> {
    const { error } = await client().from('shifts').delete().eq('id', id);
    if (error) throw error;
  },

  async assignHelper(shiftId: string, helperId: string): Promise<void> {
    const { error } = await client().from('shift_assignments').upsert({ shift_id: shiftId, helper_id: helperId });
    if (error) throw error;
  },

  async unassignHelper(shiftId: string, helperId: string): Promise<void> {
    const { error } = await client()
      .from('shift_assignments')
      .delete()
      .eq('shift_id', shiftId)
      .eq('helper_id', helperId);
    if (error) throw error;
  },

  async createHelper(input: NewHelperInput): Promise<Helper> {
    const { data, error } = await client()
      .from('helpers')
      .insert({ name: input.name, tags: input.tags, role_tag_id: input.roleTagId, availability: input.availability })
      .select()
      .single();
    if (error) throw error;
    return mapHelper(data);
  },

  async createRoleTag(name: string, color: string): Promise<RoleTag> {
    const { data, error } = await client().from('role_tags').insert({ name, color }).select().single();
    if (error) throw error;
    return mapRoleTag(data);
  },

  subscribeShifts(eventId: string, onChange: () => void): () => void {
    const channel = client()
      .channel(`shifts-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts', filter: `event_id=eq.${eventId}` }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_assignments' }, onChange)
      .subscribe();
    return () => {
      client().removeChannel(channel);
    };
  },
};
