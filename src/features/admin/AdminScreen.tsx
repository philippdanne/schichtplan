import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Picker } from '../../components/Picker';
import { Button } from '../../components/Button';
import { Timeline } from './components/Timeline';
import { HelperPool } from './components/HelperPool';
import { ShiftFormModal, type ShiftFormValue } from './components/ShiftFormModal';
import { EventFormModal } from './components/EventFormModal';
import { HelperFormModal } from './components/HelperFormModal';
import { AblaufplanModal } from './components/AblaufplanModal';
import { TagsModal } from './components/TagsModal';
import { api } from '../../shared/data/api';
import { useDragDropEnabled } from '../../shared/platform/useDragDropEnabled';
import { colors } from '../../shared/theme/colors';
import type { EventSummary, EventTag, Helper, RoleTag, Shift } from '../../shared/types';

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}. ${d.toLocaleDateString('de-DE', { month: 'short' })}`;
}

function dateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const cur = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

export function AdminScreen() {
  const dragEnabled = useDragDropEnabled();

  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [tags, setTags] = useState<EventTag[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [roleTags, setRoleTags] = useState<RoleTag[]>([]);
  const [dayIdx, setDayIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedHelperId, setSelectedHelperId] = useState<string | null>(null);
  const [shiftModal, setShiftModal] = useState<{
    open: boolean;
    editing: Shift | null;
    prefill?: { tagId: string; start: string; end: string } | null;
  }>({ open: false, editing: null });
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [helperModalOpen, setHelperModalOpen] = useState(false);
  const [ablaufplanOpen, setAblaufplanOpen] = useState(false);
  const [tagsModalOpen, setTagsModalOpen] = useState(false);
  const [daySettings, setDaySettings] = useState({ dayStart: '10:00', dayEnd: '00:00' });

  useEffect(() => {
    api.listEvents().then((evs) => {
      setEvents(evs);
      setEventId((cur) => cur ?? evs[0]?.id ?? null);
    });
    api.listHelpers().then(setHelpers);
    api.listRoleTags().then(setRoleTags);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setDayIdx(0);
    Promise.all([api.listShifts(eventId), api.listEventTags(eventId)]).then(([s, t]) => {
      setShifts(s);
      setTags(t);
      setLoading(false);
    });
    return api.subscribeShifts(eventId, () => {
      api.listShifts(eventId).then(setShifts);
    });
  }, [eventId]);

  const event = events.find((e) => e.id === eventId) ?? null;
  const days = useMemo(() => (event ? dateRange(event.startDate, event.endDate) : []), [event]);
  const currentDate = days[dayIdx] ?? days[0];
  const dayShifts = useMemo(
    () => shifts.filter((s) => s.startTime.slice(0, 10) === currentDate),
    [shifts, currentDate]
  );

  useEffect(() => {
    if (!eventId || !currentDate) return;
    api.getDaySettings(eventId, currentDate).then(setDaySettings);
  }, [eventId, currentDate]);

  const availabilityOptions = useMemo(
    () =>
      events.flatMap((ev) =>
        dateRange(ev.startDate, ev.endDate).map((date) => ({
          key: `${ev.id}:${date}`,
          label: `${ev.name} – ${formatDayLabel(date)}`,
        }))
      ),
    [events]
  );

  const usageByTag = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of shifts) out[s.tagId] = (out[s.tagId] ?? 0) + 1;
    return out;
  }, [shifts]);

  const statsByHelper = useMemo(() => {
    const out: Record<string, { count: number; minutes: number }> = {};
    for (const s of shifts) {
      const minutes = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
      for (const helperId of s.assignedHelperIds) {
        if (!out[helperId]) out[helperId] = { count: 0, minutes: 0 };
        out[helperId].count += 1;
        out[helperId].minutes += minutes;
      }
    }
    return out;
  }, [shifts]);

  async function refreshShifts() {
    if (eventId) setShifts(await api.listShifts(eventId));
  }

  async function assign(shiftId: string, helperId: string) {
    setShifts((cur) =>
      cur.map((s) =>
        s.id === shiftId && !s.assignedHelperIds.includes(helperId)
          ? { ...s, assignedHelperIds: [...s.assignedHelperIds, helperId] }
          : s
      )
    );
    await api.assignHelper(shiftId, helperId);
  }

  async function unassign(shiftId: string, helperId: string) {
    setShifts((cur) =>
      cur.map((s) => (s.id === shiftId ? { ...s, assignedHelperIds: s.assignedHelperIds.filter((id) => id !== helperId) } : s))
    );
    await api.unassignHelper(shiftId, helperId);
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  function handleDragEnd(e: DragEndEvent) {
    if (!e.over) return;
    const helperId = String(e.active.id).replace('helper:', '');
    const shiftId = String(e.over.id).replace('shift:', '');
    assign(shiftId, helperId);
  }

  const board = (
    <View style={styles.body}>
      <Timeline
        tags={tags}
        shifts={dayShifts}
        helpers={helpers}
        dayStart={daySettings.dayStart}
        dayEnd={daySettings.dayEnd}
        dragEnabled={dragEnabled}
        selectedHelperId={selectedHelperId}
        onAssignSelected={(shiftId) => {
          if (!selectedHelperId) return;
          assign(shiftId, selectedHelperId);
          setSelectedHelperId(null);
        }}
        onEditShift={(shift) => setShiftModal({ open: true, editing: shift })}
        onDeleteShift={async (id) => {
          setShifts((cur) => cur.filter((s) => s.id !== id));
          await api.deleteShift(id);
        }}
        onUnassign={unassign}
        onCreateShift={(tagId, start, end) => setShiftModal({ open: true, editing: null, prefill: { tagId, start, end } })}
      />
      <HelperPool
        helpers={helpers}
        tags={tags}
        roleTags={roleTags}
        statsByHelper={statsByHelper}
        availabilityKey={eventId && currentDate ? `${eventId}:${currentDate}` : ''}
        dragEnabled={dragEnabled}
        selectedHelperId={selectedHelperId}
        onSelectHelper={setSelectedHelperId}
        onCreateHelper={() => setHelperModalOpen(true)}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Picker value={eventId} options={events.map((e) => ({ value: e.id, label: e.name }))} onChange={setEventId} />
        <Button label="+ Neues Event" onPress={() => setEventModalOpen(true)} />
        <View>
          <Button label="Ablaufplan" onPress={() => setAblaufplanOpen(true)} />
          {!!event?.ablaufplan && <View style={styles.ablaufplanDot} />}
        </View>
        <Button label="Spalten verwalten" onPress={() => setTagsModalOpen(true)} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {days.map((d, i) => (
            <Pressable key={d} onPress={() => setDayIdx(i)} style={[styles.dayTab, i === dayIdx && styles.dayTabActive]}>
              <Text style={[styles.dayTabLabel, i === dayIdx && styles.dayTabLabelActive]}>{formatDayLabel(d)}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.dayTimeRow}>
          <Text style={styles.dayTimeLabel}>Tag von</Text>
          <TextInput
            value={daySettings.dayStart}
            onChangeText={(v) => setDaySettings((cur) => ({ ...cur, dayStart: v }))}
            onBlur={() => {
              if (eventId && currentDate) api.updateDaySettings(eventId, currentDate, { dayStart: daySettings.dayStart });
            }}
            placeholder="HH:MM"
            style={styles.dayTimeInput}
          />
          <Text style={styles.dayTimeLabel}>bis</Text>
          <TextInput
            value={daySettings.dayEnd}
            onChangeText={(v) => setDaySettings((cur) => ({ ...cur, dayEnd: v }))}
            onBlur={() => {
              if (eventId && currentDate) api.updateDaySettings(eventId, currentDate, { dayEnd: daySettings.dayEnd });
            }}
            placeholder="HH:MM"
            style={styles.dayTimeInput}
          />
        </View>
        <View style={{ flex: 1 }} />
        <Button
          label="+ Neue Schicht"
          variant="primary"
          onPress={() => setShiftModal({ open: true, editing: null })}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : dragEnabled ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          {board}
        </DndContext>
      ) : (
        board
      )}

      <ShiftFormModal
        visible={shiftModal.open}
        tags={tags}
        editing={shiftModal.editing}
        prefill={shiftModal.prefill}
        onClose={() => setShiftModal({ open: false, editing: null, prefill: null })}
        onSave={async (value: ShiftFormValue) => {
          if (!eventId || !currentDate) return;
          const startTime = `${currentDate}T${value.start}:00`;
          const endTime = `${currentDate}T${value.end}:00`;
          if (shiftModal.editing) {
            const updated = await api.updateShift(shiftModal.editing.id, {
              name: value.name,
              description: value.description,
              tagId: value.tagId,
              startTime,
              endTime,
            });
            setShifts((cur) => cur.map((s) => (s.id === updated.id ? updated : s)));
          } else {
            const created = await api.createShift({
              eventId,
              tagId: value.tagId,
              name: value.name,
              description: value.description,
              startTime,
              endTime,
            });
            setShifts((cur) => [...cur, created]);
          }
          setShiftModal({ open: false, editing: null });
        }}
      />

      <EventFormModal
        visible={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        onSave={async (value) => {
          const created = await api.createEvent(value);
          setEvents((cur) => [...cur, created]);
          setEventId(created.id);
          setEventModalOpen(false);
        }}
      />

      <AblaufplanModal
        visible={ablaufplanOpen}
        eventName={event?.name ?? ''}
        initialText={event?.ablaufplan ?? ''}
        onClose={() => setAblaufplanOpen(false)}
        onSave={async (text) => {
          if (!eventId) return;
          const updated = await api.updateEvent(eventId, { ablaufplan: text });
          setEvents((cur) => cur.map((e) => (e.id === updated.id ? updated : e)));
          setAblaufplanOpen(false);
        }}
      />

      <TagsModal
        visible={tagsModalOpen}
        eventName={event?.name ?? ''}
        tags={tags}
        usageByTag={usageByTag}
        onClose={() => setTagsModalOpen(false)}
        onCreate={async (name) => {
          if (!eventId) return;
          const created = await api.createEventTag(eventId, name);
          setTags((cur) => [...cur, created]);
        }}
        onRename={async (id, name) => {
          const updated = await api.renameEventTag(id, name);
          setTags((cur) => cur.map((t) => (t.id === updated.id ? updated : t)));
        }}
        onDelete={async (id) => {
          await api.deleteEventTag(id);
          setTags((cur) => cur.filter((t) => t.id !== id));
        }}
      />

      <HelperFormModal
        visible={helperModalOpen}
        tags={tags}
        roleTags={roleTags}
        availabilityOptions={availabilityOptions}
        onClose={() => setHelperModalOpen(false)}
        onSave={async (value) => {
          const created = await api.createHelper(value);
          setHelpers((cur) => [...cur, created]);
          setHelperModalOpen(false);
        }}
        onCreateRoleTag={async (name, color) => {
          const created = await api.createRoleTag(name, color);
          setRoleTags((cur) => [...cur, created]);
          return created;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    zIndex: 10,
  },
  ablaufplanDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  dayTabs: { flexGrow: 0 },
  dayTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dayTimeLabel: { fontSize: 13, color: colors.textSecondary },
  dayTimeInput: {
    width: 64,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 13,
    backgroundColor: colors.surface,
  },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 4 },
  dayTabActive: { backgroundColor: colors.chipBg },
  dayTabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayTabLabelActive: { color: colors.textPrimary },
  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
});
