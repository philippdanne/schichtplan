import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDroppable } from '@dnd-kit/core';
import type { EventTag, Helper, Shift } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

const PX_PER_HOUR = 56;
const COLUMN_WIDTH = 220;
const COLUMN_PADDING = 8;
const LANE_GAP = 4;

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatMinLabel(min: number): string {
  const clock = ((min % 1440) + 1440) % 1440;
  return `${Math.floor(clock / 60).toString().padStart(2, '0')}:00`;
}

/** Cluster+lane layout for time-overlapping shifts, so they render as
 * side-by-side parallel tracks instead of stacking on top of each other. */
function layoutOverlaps(items: Shift[], resolveMin: (min: number) => number): Map<string, { lane: number; lanes: number }> {
  const withRange = items
    .map((s) => ({ shift: s, start: resolveMin(minutesOfDay(s.startTime)), end: resolveMin(minutesOfDay(s.endTime)) }))
    .sort((a, b) => a.start - b.start);

  const result = new Map<string, { lane: number; lanes: number }>();
  let cluster: typeof withRange = [];
  let clusterMaxEnd = -Infinity;

  function flush() {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    for (const item of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= item.start);
      if (laneIdx === -1) {
        laneIdx = laneEnds.length;
        laneEnds.push(item.end);
      } else {
        laneEnds[laneIdx] = item.end;
      }
      laneOf.set(item.shift.id, laneIdx);
    }
    const lanes = laneEnds.length;
    for (const item of cluster) result.set(item.shift.id, { lane: laneOf.get(item.shift.id)!, lanes });
    cluster = [];
    clusterMaxEnd = -Infinity;
  }

  for (const item of withRange) {
    if (cluster.length === 0 || item.start < clusterMaxEnd) {
      cluster.push(item);
      clusterMaxEnd = Math.max(clusterMaxEnd, item.end);
    } else {
      flush();
      cluster.push(item);
      clusterMaxEnd = item.end;
    }
  }
  flush();
  return result;
}

interface Props {
  tags: EventTag[];
  shifts: Shift[];
  helpers: Helper[];
  dayStart: string;
  dayEnd: string;
  dragEnabled: boolean;
  selectedHelperId: string | null;
  onAssignSelected: (shiftId: string) => void;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onUnassign: (shiftId: string, helperId: string) => void;
  onCreateShift: (tagId: string, start: string, end: string) => void;
}

export function Timeline(props: Props) {
  const { tags, shifts, helpers } = props;
  const dayStartMin = timeToMin(props.dayStart);
  const dayEndMinRaw = timeToMin(props.dayEnd);
  const dayEndMin = dayEndMinRaw <= dayStartMin ? dayEndMinRaw + 1440 : dayEndMinRaw;
  // Only wrap early-morning clock times into "tomorrow" when the day
  // actually spans midnight (dayEnd <= dayStart) — and only the clock times
  // that fall in that early-morning sliver (before the raw, un-extended
  // dayEnd). Wrapping on `clockMin < dayStartMin` alone (the previous logic)
  // wrapped any shift starting before dayStart even on an ordinary
  // same-day range, corrupting start/end by wrapping one but not the other.
  const spansMidnight = dayEndMinRaw <= dayStartMin;
  const resolveMin = (clockMin: number) => (spansMidnight && clockMin < dayEndMinRaw ? clockMin + 1440 : clockMin);
  const height = ((dayEndMin - dayStartMin) / 60) * PX_PER_HOUR;
  const tickCount = Math.round((dayEndMin - dayStartMin) / 60) + 1;
  const ticks = Array.from({ length: tickCount }, (_, i) => dayStartMin + i * 60);
  const helperName = (id: string) => helpers.find((h) => h.id === id)?.name ?? '?';
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function handleColumnCreate(tagId: string, startMin: number, endMin: number) {
    const clamp = (m: number) => Math.max(0, Math.min(1439, m));
    const toHHMM = (m: number) => `${Math.floor(m / 60).toString().padStart(2, '0')}:${(m % 60).toString().padStart(2, '0')}`;
    const s = clamp(startMin);
    const e = clamp(endMin) <= s ? Math.min(1439, s + 60) : clamp(endMin);
    props.onCreateShift(tagId, toHHMM(s), toHHMM(e));
  }

  return (
    <View style={styles.wrap}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row' }}>
        <View style={[styles.hourRail, { height }]}>
          {ticks.map((min) => (
            <Text key={min} style={[styles.hourTick, { top: ((min - dayStartMin) / 60) * PX_PER_HOUR - 6 }]}>
              {formatMinLabel(min)}
            </Text>
          ))}
        </View>
        {tags.map((tag) => {
          const columnShifts = shifts.filter((s) => s.tagId === tag.id);
          const lanesById = layoutOverlaps(columnShifts, resolveMin);
          const columnBody = (
            <View style={[styles.column, { height }]}>
              <View style={styles.columnHeader}>
                <Text style={styles.columnHeaderLabel}>{tag.name}</Text>
              </View>
              {columnShifts.map((shift) => {
                const top = ((resolveMin(minutesOfDay(shift.startTime)) - dayStartMin) / 60) * PX_PER_HOUR;
                const heightPx = Math.max(
                  32,
                  ((resolveMin(minutesOfDay(shift.endTime)) - resolveMin(minutesOfDay(shift.startTime))) / 60) * PX_PER_HOUR
                );
                const { lane, lanes } = lanesById.get(shift.id) ?? { lane: 0, lanes: 1 };
                const innerWidth = COLUMN_WIDTH - COLUMN_PADDING * 2;
                const laneWidth = (innerWidth - LANE_GAP * (lanes - 1)) / lanes;
                const left = COLUMN_PADDING + lane * (laneWidth + LANE_GAP);
                return (
                  <View key={shift.id} style={[styles.blockPosition, { top, height: heightPx, left, width: laneWidth }]}>
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

          return props.dragEnabled ? (
            <DragCreateColumn
              key={tag.id}
              height={height}
              dayStartMin={dayStartMin}
              onCreate={(startMin, endMin) => handleColumnCreate(tag.id, startMin, endMin)}
            >
              {columnBody}
            </DragCreateColumn>
          ) : (
            <React.Fragment key={tag.id}>{columnBody}</React.Fragment>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DragCreateColumn({
  height,
  dayStartMin,
  onCreate,
  children,
}: {
  height: number;
  dayStartMin: number;
  onCreate: (startMin: number, endMin: number) => void;
  children: React.ReactNode;
}) {
  // Plain DOM node, same reasoning as DroppableShiftBlock/DraggableHelperCard
  // — needs real window-level mouse tracking for the drag gesture, and only
  // ever renders when dragEnabled (web/tablet).
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<{ startY: number; currentY: number } | null>(null);

  function yToMin(y: number): number {
    return Math.round((dayStartMin + (y / PX_PER_HOUR) * 60) / 15) * 15;
  }

  function handleMouseDown(e: React.MouseEvent) {
    // Ignore mousedowns that started on a shift block — only bare column
    // background starts a create-drag. The inner column View fills the
    // whole wrapper, so target===currentTarget never holds; walk the real
    // DOM instead via the marker DroppableShiftBlock sets on itself.
    if ((e.target as HTMLElement).closest('[data-shift-block]')) return;
    const rect = ref.current!.getBoundingClientRect();
    const startY = e.clientY - rect.top;
    setDrag({ startY, currentY: startY });

    function handleMove(ev: MouseEvent) {
      const currentY = ev.clientY - rect.top;
      setDrag((d) => (d ? { ...d, currentY } : d));
    }
    function handleUp(ev: MouseEvent) {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      const endY = ev.clientY - rect.top;
      setDrag((d) => {
        if (!d) return null;
        const dragged = Math.abs(endY - d.startY) > 4;
        const startMin = yToMin(Math.min(d.startY, endY));
        const endMin = dragged ? yToMin(Math.max(d.startY, endY)) : startMin + 60;
        onCreate(startMin, endMin);
        return null;
      });
    }
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  }

  const previewTop = drag ? Math.min(drag.startY, drag.currentY) : 0;
  const previewHeight = drag ? Math.max(2, Math.abs(drag.currentY - drag.startY)) : 0;

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      style={{ position: 'relative', height, width: COLUMN_WIDTH, cursor: 'crosshair', flexShrink: 0 }}
    >
      {children}
      {drag && (
        <View style={[styles.dragPreview, { top: previewTop, height: previewHeight }]} pointerEvents="none" />
      )}
    </div>
  );
}

function DroppableShiftBlock({ shiftId, children }: { shiftId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `shift:${shiftId}` });
  // Plain DOM node for the same reason as DraggableHelperCard in
  // HelperPool.tsx — only rendered on web.
  return (
    <div ref={setNodeRef} data-shift-block="true" style={{ height: '100%' }}>
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
  blockPosition: { position: 'absolute' },
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
  dragPreview: {
    position: 'absolute',
    left: 8,
    right: 8,
    borderRadius: 9,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.teal,
    backgroundColor: colors.tealBg,
  },
});
