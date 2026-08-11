import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '../../components/Picker';
import { api } from '../../shared/data/api';
import type { EventSummary, EventTag, Helper, Shift } from '../../shared/types';
import { colors } from '../../shared/theme/colors';

interface DayGroup {
  key: string;
  label: string;
  shifts: Shift[];
}

const WEEKDAYS = ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'];

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate().toString().padStart(2, '0')}. ${d.toLocaleDateString('de-DE', { month: 'short' })}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function HelferScreen() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [tags, setTags] = useState<EventTag[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listEvents().then((evs) => {
      setEvents(evs);
      setEventId((cur) => cur ?? evs[0]?.id ?? null);
    });
    api.listHelpers().then(setHelpers);
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    Promise.all([api.listShifts(eventId), api.listEventTags(eventId)]).then(([s, t]) => {
      setShifts(s);
      setTags(t);
      setLoading(false);
    });
    return api.subscribeShifts(eventId, () => {
      api.listShifts(eventId).then(setShifts);
    });
  }, [eventId]);

  const helperName = (id: string) => helpers.find((h) => h.id === id)?.name ?? '';
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? '';

  const dayGroups: DayGroup[] = useMemo(() => {
    const filter = nameFilter.trim().toLowerCase();
    const filtered = filter
      ? shifts.filter((s) => s.assignedHelperIds.some((id) => helperName(id).toLowerCase().includes(filter)))
      : shifts;
    const byDate = new Map<string, Shift[]>();
    for (const s of filtered) {
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
  }, [shifts, nameFilter, helpers]);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Picker
          value={eventId}
          options={events.map((e) => ({ value: e.id, label: e.name }))}
          onChange={setEventId}
        />
        <TextInput
          value={nameFilter}
          onChangeText={setNameFilter}
          placeholder="Nach Namen filtern (z. B. deinem eigenen)…"
          style={styles.filterInput}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={dayGroups}
          keyExtractor={(d) => d.key}
          ListEmptyComponent={<Text style={styles.empty}>Keine Schichten gefunden.</Text>}
          renderItem={({ item: day }) => (
            <View style={styles.dayGroup}>
              <Text style={styles.dayLabel}>{day.label}</Text>
              {day.shifts.map((shift) => (
                <View key={shift.id} style={styles.row}>
                  <Text style={styles.rowTime}>
                    {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
                  </Text>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowName}>{shift.name}</Text>
                    <Text style={styles.rowSub}>
                      {tagName(shift.tagId)} · {shift.description}
                    </Text>
                  </View>
                  <Text style={styles.rowAssigned} numberOfLines={2}>
                    {shift.assignedHelperIds.length
                      ? shift.assignedHelperIds.map(helperName).join(', ')
                      : 'Unbesetzt'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  controls: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  filterInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  list: { maxWidth: 760, width: '100%', alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 60 },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
  dayGroup: { marginBottom: 22 },
  dayLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  rowTime: { width: 96, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
  rowAssigned: { maxWidth: 220, textAlign: 'right', fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
});
