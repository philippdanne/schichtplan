import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Picker } from '../../components/Picker';
import { Button } from '../../components/Button';
import { Timeline } from './components/Timeline';
import { HelperPool } from './components/HelperPool';
import { ShiftFormModal, type ShiftFormValue } from './components/ShiftFormModal';
import { EventFormModal } from './components/EventFormModal';
import { HelperFormModal } from './components/HelperFormModal';
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
  const [shiftModal, setShiftModal] = useState<{ open: boolean; editing: Shift | null }>({ open: false, editing: null });
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [helperModalOpen, setHelperModalOpen] = useState(false);

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
      />
      <HelperPool
        helpers={helpers}
        tags={tags}
        roleTags={roleTags}
        statsByHelper={statsByHelper}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabs}>
          {days.map((d, i) => (
            <Pressable key={d} onPress={() => setDayIdx(i)} style={[styles.dayTab, i === dayIdx && styles.dayTabActive]}>
              <Text style={[styles.dayTabLabel, i === dayIdx && styles.dayTabLabelActive]}>{formatDayLabel(d)}</Text>
            </Pressable>
          ))}
        </ScrollView>
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
        onClose={() => setShiftModal({ open: false, editing: null })}
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

      <HelperFormModal
        visible={helperModalOpen}
        tags={tags}
        roleTags={roleTags}
        onClose={() => setHelperModalOpen(false)}
        onSave={async (value) => {
          const created = await api.createHelper(value);
          setHelpers((cur) => [...cur, created]);
          setHelperModalOpen(false);
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
  dayTabs: { flexGrow: 0 },
  dayTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 4 },
  dayTabActive: { backgroundColor: colors.chipBg },
  dayTabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  dayTabLabelActive: { color: colors.textPrimary },
  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
});
