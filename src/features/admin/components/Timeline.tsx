import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDroppable } from '@dnd-kit/core';
import type { EventTag, Helper, Shift } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

const HOUR_START = 8;
const HOUR_END = 24;
const PX_PER_HOUR = 56;

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  tags: EventTag[];
  shifts: Shift[];
  helpers: Helper[];
  dragEnabled: boolean;
  selectedHelperId: string | null;
  onAssignSelected: (shiftId: string) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onUnassign: (shiftId: string, helperId: string) => void;
}

export function Timeline(props: Props) {
  const { tags, shifts, helpers } = props;
  const height = (HOUR_END - HOUR_START) * PX_PER_HOUR;
  const ticks = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
  const helperName = (id: string) => helpers.find((h) => h.id === id)?.name ?? '?';
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row' }}>
        <View style={[styles.hourRail, { height }]}>
          {ticks.map((h) => (
            <Text key={h} style={[styles.hourTick, { top: (h - HOUR_START) * PX_PER_HOUR - 6 }]}>
              {h.toString().padStart(2, '0')}:00
            </Text>
          ))}
        </View>
        {tags.map((tag) => {
          const columnShifts = shifts.filter((s) => s.tagId === tag.id);
          return (
            <View key={tag.id} style={[styles.column, { height }]}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderLabel}>{tag.name}</Text>
              </View>
              {columnShifts.map((shift) => {
                const top = ((minutesOfDay(shift.startTime) - HOUR_START * 60) / 60) * PX_PER_HOUR;
                const heightPx = Math.max(
                  32,
                  ((minutesOfDay(shift.endTime) - minutesOfDay(shift.startTime)) / 60) * PX_PER_HOUR
                );
                return (
                  <View key={shift.id} style={[styles.blockPosition, { top, height: heightPx }]}>
                    {props.dragEnabled ? (
                      <DroppableShiftBlock shiftId={shift.id}>
                        <ShiftBlockContent
                          shift={shift}
                          helperName={helperName}
                          confirming={confirmingId === shift.id}
                          onEdit={() => props.onEditShift(shift)}
                          onStartDelete={() => setConfirmingId(shift.id)}
                          onCancelDelete={() => setConfirmingId(null)}
                          onConfirmDelete={() => {
                            setConfirmingId(null);
                            props.onDeleteShift(shift.id);
                          }}
                          onUnassign={(helperId) => props.onUnassign(shift.id, helperId)}
                        />
                      </DroppableShiftBlock>
                    ) : (
                      <Pressable
                        disabled={!props.selectedHelperId}
                        onPress={() => props.onAssignSelected(shift.id)}
                        style={({ pressed }) => [
                          styles.block,
                          props.selectedHelperId ? styles.blockAssignable : null,
                          pressed && props.selectedHelperId ? { opacity: 0.85 } : null,
                        ]}
                      >
                        <ShiftBlockContent
                          shift={shift}
                          helperName={helperName}
                          confirming={confirmingId === shift.id}
                          onEdit={() => props.onEditShift(shift)}
                          onStartDelete={() => setConfirmingId(shift.id)}
                          onCancelDelete={() => setConfirmingId(null)}
                          onConfirmDelete={() => {
                            setConfirmingId(null);
                            props.onDeleteShift(shift.id);
                          }}
                          onUnassign={(helperId) => props.onUnassign(shift.id, helperId)}
                        />
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DroppableShiftBlock({ shiftId, children }: { shiftId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `shift:${shiftId}` });
  // Plain DOM node for the same reason as DraggableHelperCard in
  // HelperPool.tsx — only rendered on web.
  return (
    <div ref={setNodeRef} style={{ height: '100%' }}>
      <View style={[styles.block, isOver && styles.blockOver]}>{children}</View>
    </div>
  );
}

function ShiftBlockContent({
  shift,
  helperName,
  confirming,
  onEdit,
  onStartDelete,
  onCancelDelete,
  onConfirmDelete,
  onUnassign,
}: {
  shift: Shift;
  helperName: (id: string) => string;
  confirming: boolean;
  onEdit: () => void;
  onStartDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onUnassign: (helperId: string) => void;
}) {
  if (confirming) {
    return (
      <View style={styles.confirmWrap}>
        <Text style={styles.confirmLabel}>Schicht löschen?</Text>
        <View style={styles.confirmActions}>
          <Pressable onPress={onConfirmDelete} style={styles.confirmYes}>
            <Text style={styles.confirmYesLabel}>Ja</Text>
          </Pressable>
          <Pressable onPress={onCancelDelete} style={styles.confirmNo}>
            <Text style={styles.confirmNoLabel}>Nein</Text>
          </Pressable>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.blockTopRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.blockName} numberOfLines={1}>
            {shift.name}
          </Text>
          <Text style={styles.blockMeta} numberOfLines={1}>
            {formatTime(shift.startTime)}–{formatTime(shift.endTime)} · {shift.description}
          </Text>
        </View>
        <View style={styles.blockActions}>
          <Pressable onPress={onEdit} style={styles.iconButton}>
            <Text style={styles.iconButtonLabel}>✎</Text>
          </Pressable>
          <Pressable onPress={onStartDelete} style={styles.iconButton}>
            <Text style={styles.iconButtonLabel}>✕</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.chips}>
        {shift.assignedHelperIds.map((id) => (
          <View key={id} style={styles.chip}>
            <Text style={styles.chipLabel}>{helperName(id)}</Text>
            <Pressable onPress={() => onUnassign(id)} style={styles.chipRemove}>
              <Text style={styles.chipRemoveLabel}>✕</Text>
            </Pressable>
          </View>
        ))}
        {shift.assignedHelperIds.length === 0 && (
          <Text style={styles.unassignedLabel}>Unbesetzt — Helfer hier zuweisen</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  hourRail: { width: 56, position: 'relative', borderRightWidth: 1, borderRightColor: colors.border },
  hourTick: { position: 'absolute', right: 6, fontSize: 11, color: colors.textSecondary },
  column: {
    width: 220,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  columnHeader: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  columnHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  blockPosition: { position: 'absolute', left: 8, right: 8 },
  block: {
    flex: 1,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    padding: 8,
  },
  blockAssignable: { borderColor: colors.accent, borderStyle: 'dashed' },
  blockOver: { borderColor: colors.teal, backgroundColor: colors.tealBg },
  blockTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  blockName: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  blockMeta: { fontSize: 11.5, color: colors.textSecondary, marginTop: 1 },
  blockActions: { flexDirection: 'row', gap: 4 },
  iconButton: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonLabel: { fontSize: 10, color: colors.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.chipBg,
    borderRadius: 20,
    paddingVertical: 3,
    paddingLeft: 9,
    paddingRight: 3,
  },
  chipLabel: { fontSize: 11.5, fontWeight: '500', color: colors.textPrimary },
  chipRemove: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.chipRemoveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemoveLabel: { fontSize: 9, color: colors.textSecondary },
  unassignedLabel: { fontSize: 11, color: colors.danger, fontWeight: '500' },
  confirmWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  confirmLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  confirmActions: { flexDirection: 'row', gap: 8 },
  confirmYes: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.danger },
  confirmYesLabel: { fontSize: 12, color: '#fff', fontWeight: '600' },
  confirmNo: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  confirmNoLabel: { fontSize: 12, color: colors.textPrimary },
});
