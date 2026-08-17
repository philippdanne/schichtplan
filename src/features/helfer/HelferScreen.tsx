import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '../../components/Picker';
import { api } from '../../shared/data/api';
import type { EventSummary, EventTag, Helper, Shift } from '../../shared/types';
import { colors } from '../../shared/theme/colors';
import { formatDayTabParts, formatTime, groupShiftsByDay } from '../../shared/format/schedule';
import { exportSchedulePdf } from '../../shared/print/exportSchedulePdf';

// Mobile-first redesign implemented from the Claude Design handoff at
// design/project/Helferansicht Mobil.dc.html — see that file (and
// AGENTS.md) for the source of the layout/interaction decisions below
// (the "Wer bist du?" picker, sticky day tabs, own-shift highlighting,
// chip overflow with "+N weitere").

const VISIBLE_HELPER_LIMIT = 4;

export function HelferScreen({ initialEventId }: { initialEventId?: string | null }) {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);
  const [tags, setTags] = useState<EventTag[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [helpers, setHelpers] = useState<Helper[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
  const activeDay = dayGroups.find((d) => d.key === activeDayKey) ?? dayGroups[0] ?? null;

  // Only names actually working this event — no point offering the whole
  // org-wide helper pool when picking "who are you" for one event.
  const allNames = useMemo(() => {
    const names = new Set<string>();
    for (const s of shifts) for (const id of s.assignedHelperIds) names.add(helperName(id));
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'de'));
  }, [shifts, helpers]);

  const q = searchQuery.trim().toLowerCase();
  const filteredNames = allNames.filter((n) => n.toLowerCase().includes(q));
  const showUseTyped = q.length > 0 && !filteredNames.some((n) => n.toLowerCase() === q);

  function openPicker() {
    setPickerOpen(true);
    setSearchQuery('');
  }
  function closePicker() {
    setPickerOpen(false);
  }
  function pickName(name: string) {
    setSelectedName(name);
    setPickerOpen(false);
    setSearchQuery('');
  }
  function useTypedName() {
    const typed = searchQuery.trim();
    if (typed) pickName(typed);
  }
  function toggleOnlyMine() {
    setOnlyMine((v) => !v);
  }
  function toggleExpand(shiftId: string) {
    setExpanded((cur) => ({ ...cur, [shiftId]: !cur[shiftId] }));
  }

  interface Section {
    key: string;
    showHeader: boolean;
    headerLabel: string;
    shifts: Shift[];
  }

  let sections: Section[];
  let emptyMine = false;
  if (onlyMine && selectedName) {
    sections = dayGroups
      .map((d) => ({
        key: d.key,
        showHeader: true,
        headerLabel: d.label,
        shifts: d.shifts.filter((s) => s.assignedHelperIds.some((id) => helperName(id) === selectedName)),
      }))
      .filter((sec) => sec.shifts.length > 0);
    emptyMine = sections.length === 0;
  } else {
    sections = activeDay ? [{ key: activeDay.key, showHeader: false, headerLabel: '', shifts: activeDay.shifts }] : [];
  }

  async function handleExportPdf() {
    if (!event) return;
    setExporting(true);
    try {
      await exportSchedulePdf({ event, tags, shifts, helpers });
    } finally {
      setExporting(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.accent} />
      ) : (
        <ScrollView contentContainerStyle={styles.page}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Schichtplan</Text>
            <Picker
              value={eventId}
              options={events.map((e) => ({ value: e.id, label: e.name }))}
              onChange={setEventId}
            />
          </View>

          <View style={styles.whoBox}>
            {!selectedName ? (
              <Pressable style={styles.whoButton} onPress={openPicker}>
                <Text style={styles.whoButtonTitle}>Wer bist du?</Text>
                <Text style={styles.whoButtonSub}>Namen wählen, um deine Schichten hervorzuheben</Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.selectedRow}>
                  <View style={styles.selectedPill}>
                    <View style={styles.selectedDot} />
                    <Text style={styles.selectedText}>
                      Du bist <Text style={styles.selectedTextBold}>{selectedName}</Text>
                    </Text>
                  </View>
                  <Pressable onPress={openPicker} hitSlop={8}>
                    <Text style={styles.changeLink}>ändern</Text>
                  </Pressable>
                </View>
                <Pressable
                  style={[styles.onlyMineToggle, onlyMine && styles.onlyMineToggleActive]}
                  onPress={toggleOnlyMine}
                >
                  <View style={[styles.onlyMineDot, onlyMine && styles.onlyMineDotActive]} />
                  <Text style={[styles.onlyMineLabel, onlyMine && styles.onlyMineLabelActive]}>
                    Nur meine Schichten zeigen
                  </Text>
                </Pressable>
              </>
            )}

            {pickerOpen && (
              <View style={styles.pickerPanel}>
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Namen suchen oder eingeben…"
                  style={styles.pickerInput}
                  autoFocus
                />
                <ScrollView style={styles.pickerList}>
                  {filteredNames.map((n) => (
                    <Pressable key={n} style={styles.pickerRow} onPress={() => pickName(n)}>
                      <Text style={styles.pickerRowLabel}>{n}</Text>
                    </Pressable>
                  ))}
                  {showUseTyped && (
                    <Pressable style={styles.pickerRow} onPress={useTypedName}>
                      <Text style={styles.useTypedLabel}>„{searchQuery}“ verwenden</Text>
                    </Pressable>
                  )}
                </ScrollView>
                <Pressable onPress={closePicker}>
                  <Text style={styles.pickerClose}>Abbrechen</Text>
                </Pressable>
              </View>
            )}
          </View>

          {!onlyMine && dayGroups.length > 0 && (
            <View style={styles.dayTabsBar}>
              <View style={styles.dayTabsRow}>
                {dayGroups.map((d) => {
                  const active = d.key === activeDay?.key;
                  const { weekday, dateLabel } = formatDayTabParts(d.key);
                  return (
                    <Pressable
                      key={d.key}
                      style={[styles.dayTab, active && styles.dayTabActive]}
                      onPress={() => setActiveDayKey(d.key)}
                    >
                      <Text style={[styles.dayTabLabel, active && styles.dayTabLabelActive]}>{weekday}</Text>
                      <Text style={[styles.dayTabDate, active && styles.dayTabDateActive]}>{dateLabel}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.list}>
            {emptyMine && <Text style={styles.emptyMine}>Keine eigenen Schichten in diesem Zeitraum.</Text>}
            {sections.length === 0 && !emptyMine && (
              <Text style={styles.emptyMine}>Keine Schichten gefunden.</Text>
            )}
            {sections.map((sec) => (
              <View key={sec.key}>
                {sec.showHeader && <Text style={styles.sectionHeader}>{sec.headerLabel}</Text>}
                {sec.shifts.map((shift) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    tagName={tagName(shift.tagId)}
                    helperName={helperName}
                    selectedName={selectedName}
                    expanded={!!expanded[shift.id]}
                    onToggleExpand={() => toggleExpand(shift.id)}
                  />
                ))}
              </View>
            ))}
          </View>

          <View style={styles.footer}>
            <Pressable onPress={handleExportPdf} disabled={!event || exporting} hitSlop={8}>
              <Text style={[styles.pdfButton, (!event || exporting) && styles.pdfButtonDisabled]}>
                Gesamten Plan als PDF exportieren
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function ShiftCard({
  shift,
  tagName,
  helperName,
  selectedName,
  expanded,
  onToggleExpand,
}: {
  shift: Shift;
  tagName: string;
  helperName: (id: string) => string;
  selectedName: string | null;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const names = shift.assignedHelperIds.map(helperName);
  const unbesetzt = names.length === 0;
  const isMine = !!selectedName && names.includes(selectedName);
  const orderedNames = isMine ? [selectedName!, ...names.filter((n) => n !== selectedName)] : names;
  const visible = expanded ? orderedNames : orderedNames.slice(0, VISIBLE_HELPER_LIMIT);
  const hasMore = !expanded && orderedNames.length > VISIBLE_HELPER_LIMIT;
  const extra = orderedNames.length - VISIBLE_HELPER_LIMIT;

  return (
    <View
      style={[
        styles.card,
        isMine && styles.cardMine,
        !isMine && unbesetzt && styles.cardUnbesetzt,
      ]}
    >
      {isMine && <Text style={styles.mineBadge}>Deine Schicht</Text>}
      <View style={styles.cardTopRow}>
        <Text style={styles.cardTime}>
          {formatTime(shift.startTime)}–{formatTime(shift.endTime)}
        </Text>
        {unbesetzt && (
          <View style={styles.unbesetztBadge}>
            <Text style={styles.unbesetztBadgeLabel}>Unbesetzt</Text>
          </View>
        )}
      </View>
      <Text style={[styles.cardTitle, isMine && styles.cardTitlePadded]}>{shift.name}</Text>
      <Text style={styles.cardMeta}>
        {tagName}
        {shift.description ? ` · ${shift.description}` : ''}
      </Text>
      {!unbesetzt && (
        <View style={styles.chipsRow}>
          {visible.map((name) => (
            <View key={name} style={[styles.chip, name === selectedName && styles.chipMine]}>
              <Text style={[styles.chipLabel, name === selectedName && styles.chipLabelMine]}>{name}</Text>
            </View>
          ))}
          {hasMore && (
            <Pressable style={styles.moreChip} onPress={onToggleExpand}>
              <Text style={styles.moreChipLabel}>+{extra} weitere</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  page: { maxWidth: 430, width: '100%', alignSelf: 'center', paddingBottom: 32 },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
    paddingTop: 18,
    paddingBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },

  whoBox: { paddingHorizontal: 16, paddingTop: 10, gap: 10, position: 'relative', zIndex: 25 },

  whoButton: {
    alignItems: 'flex-start',
    gap: 4,
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 16,
    padding: 18,
    minHeight: 44,
    justifyContent: 'center',
  },
  whoButtonTitle: { fontSize: 19, fontWeight: '700', color: colors.accentContrast },
  whoButtonSub: { fontSize: 13, fontWeight: '500', color: colors.accentContrast, opacity: 0.9 },

  selectedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  selectedPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  selectedDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  selectedText: { fontSize: 16, color: colors.textPrimary },
  selectedTextBold: { fontWeight: '700' },
  changeLink: { fontSize: 14, fontWeight: '600', color: colors.accent, paddingVertical: 10, paddingHorizontal: 6 },

  onlyMineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    minHeight: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  onlyMineToggleActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  onlyMineDot: { width: 18, height: 18, borderRadius: 6, borderWidth: 2, borderColor: colors.borderStrong },
  onlyMineDotActive: { borderColor: colors.accentContrast, backgroundColor: colors.accentContrast },
  onlyMineLabel: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  onlyMineLabelActive: { color: colors.accentContrast },

  pickerPanel: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    marginTop: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    maxHeight: 380,
    zIndex: 30,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  pickerInput: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    minHeight: 44,
  },
  pickerList: { maxHeight: 260 },
  pickerRow: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 8, minHeight: 44, justifyContent: 'center' },
  pickerRowLabel: { fontSize: 16, color: colors.textPrimary },
  useTypedLabel: { fontSize: 15, fontWeight: '600', color: colors.accent },
  pickerClose: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', paddingVertical: 8 },

  dayTabsBar: {
    position: 'sticky' as unknown as 'relative',
    top: 0,
    zIndex: 20,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayTabsRow: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 4,
  },
  dayTab: { flex: 1, alignItems: 'center', gap: 2, minHeight: 44, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 12, justifyContent: 'center' },
  dayTabActive: { backgroundColor: colors.accent },
  dayTabLabel: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  dayTabLabelActive: { color: colors.accentContrast },
  dayTabDate: { fontSize: 12, fontWeight: '500', color: colors.textPrimary, opacity: 0.65 },
  dayTabDateActive: { color: colors.accentContrast, opacity: 0.9 },

  list: { paddingHorizontal: 16, paddingTop: 14 },
  emptyMine: { textAlign: 'center', color: colors.textSecondary, fontSize: 15, paddingVertical: 24 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 8,
  },

  card: {
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardMine: {
    backgroundColor: colors.accentBg,
    borderColor: colors.accent,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  cardUnbesetzt: { borderLeftWidth: 4, borderLeftColor: colors.danger },
  mineBadge: {
    position: 'absolute',
    top: 12,
    right: 14,
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  cardTime: { fontSize: 15, fontWeight: '700', color: colors.textSecondary },
  unbesetztBadge: { backgroundColor: colors.danger, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  unbesetztBadgeLabel: { fontSize: 12, fontWeight: '700', color: colors.accentContrast, textTransform: 'uppercase', letterSpacing: 0.2 },
  cardTitle: { fontSize: 18, fontWeight: '700', lineHeight: 23, color: colors.textPrimary, marginBottom: 2 },
  cardTitlePadded: { paddingRight: 90 },
  cardMeta: { fontSize: 14, color: colors.textSecondary, lineHeight: 19.6, marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.chipBg },
  chipMine: { backgroundColor: colors.accent },
  chipLabel: { fontSize: 14, fontWeight: '500', color: colors.textPrimary },
  chipLabelMine: { fontWeight: '700', color: colors.accentContrast },
  moreChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    minHeight: 32,
    justifyContent: 'center',
  },
  moreChipLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },

  footer: { padding: 20, paddingTop: 20, paddingBottom: 8, alignItems: 'center' },
  pdfButton: { fontSize: 13, color: colors.textSecondary, textDecorationLine: 'underline', minHeight: 44, textAlignVertical: 'center' },
  pdfButtonDisabled: { opacity: 0.5 },
});
