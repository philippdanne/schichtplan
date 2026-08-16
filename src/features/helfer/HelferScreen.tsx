import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '../../components/Picker';
import { Button } from '../../components/Button';
import { api } from '../../shared/data/api';
import type { EventSummary, EventTag, Helper, Shift } from '../../shared/types';
import { colors } from '../../shared/theme/colors';
import { formatTime, groupShiftsByDay } from '../../shared/format/schedule';
import { exportSchedulePdf } from '../../shared/print/exportSchedulePdf';

export function HelferScreen({ initialEventId }: { initialEventId?: string | null }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [tags, setTags] = useState<EventTag[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.listEvents().then((evs) => {
      setEvents(evs);
      setEventId((cur) => cur ?? initialEventId ?? evs[0]?.id ?? null);
    });
    api.listHelpers().then(setHelpers);
  }, [initialEventId]);

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

  const event = events.find((e) => e.id === eventId) ?? null;
  const helperName = (id: string) => helpers.find((h) => h.id === id)?.name ?? '';
  const tagName = (id: string) => tags.find((t) => t.id === id)?.name ?? '';

  const dayGroups = useMemo(() => groupShiftsByDay(shifts), [shifts]);

  const helperNameOptions = useMemo(() => {
    const names = Array.from(new Set(helpers.map((h) => h.name))).sort((a, b) => a.localeCompare(b, 'de'));
    return [{ value: '', label: '— Name wählen —' }, ...names.map((n) => ({ value: n, label: n }))];
  }, [helpers]);

  const isOwnHelper = (id: string) => {
    const filter = nameFilter.trim().toLowerCase();
    if (!filter) return false;
    return helperName(id).toLowerCase().includes(filter);
  };
  const isOwnShift = (shift: Shift) => shift.assignedHelperIds.some(isOwnHelper);

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Picker
          value={eventId}
          options={events.map((e) => ({ value: e.id, label: e.name }))}
          onChange={setEventId}
        />
        <Picker
          value={helperNameOptions.some((o) => o.value === nameFilter) ? nameFilter : ''}
          options={helperNameOptions}
          onChange={setNameFilter}
        />
        <TextInput
          value={nameFilter}
          onChangeText={setNameFilter}
          placeholder="…oder Namen eingeben"
          style={styles.filterInput}
        />
        <Button
          label="Als PDF exportieren"
          disabled={!event || exporting}
          onPress={async () => {
            if (!event) return;
            setExporting(true);
            try {
              await exportSchedulePdf({ event, tags, shifts, helpers });
            } finally {
              setExporting(false);
            }
          }}
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
              {day.shifts.map((shift) => {
                const own = isOwnShift(shift);
                return (
                  <View key={shift.id} style={[styles.row, own && styles.rowOwn]}>
                    <Text style={styles.rowTime}>
                      {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
                    </Text>
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowName, own && styles.rowNameOwn]}>{shift.name}</Text>
                      <Text style={styles.rowSub}>
                        {tagName(shift.tagId)} · {shift.description}
                      </Text>
                    </View>
                    <View style={styles.assignedWrap}>
                      {shift.assignedHelperIds.length ? (
                        shift.assignedHelperIds.map((id) => (
                          <View key={id} style={[styles.helperChip, isOwnHelper(id) && styles.helperChipOwn]}>
                            <Text style={[styles.helperChipLabel, isOwnHelper(id) && styles.helperChipLabelOwn]}>
                              {helperName(id)}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.unassignedLabel}>Unbesetzt</Text>
                      )}
                    </View>
                  </View>
                );
              })}
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
  rowOwn: { borderColor: colors.accent, backgroundColor: colors.tealBg },
  rowTime: { width: 96, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 14.5, fontWeight: '600', color: colors.textPrimary },
  rowNameOwn: { color: colors.accent },
  rowSub: { fontSize: 12.5, color: colors.textSecondary, marginTop: 1 },
  assignedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: 280,
  },
  helperChip: {
    backgroundColor: colors.chipBg,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 11,
  },
  helperChipOwn: { backgroundColor: colors.accent },
  helperChipLabel: { fontSize: 12.5, fontWeight: '600', color: colors.textPrimary },
  helperChipLabelOwn: { color: colors.accentContrast },
  unassignedLabel: { fontSize: 13, color: colors.danger, fontWeight: '500' },
});
