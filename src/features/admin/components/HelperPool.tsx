import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDraggable } from '@dnd-kit/core';
import type { EventTag, Helper, RoleTag } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

interface Props {
  helpers: Helper[];
  tags: EventTag[];
  roleTags: RoleTag[];
  statsByHelper: Record<string, { count: number; minutes: number }>;
  /** "eventId:date" for the day currently shown in the timeline; helpers unavailable that day are greyed out. */
  availabilityKey: string;
  dragEnabled: boolean;
  selectedHelperId: string | null;
  onSelectHelper: (id: string | null) => void;
  onCreateHelper: () => void;
}

function isHelperAvailable(helper: Helper, availabilityKey: string): boolean {
  return helper.availability === null || helper.availability.includes(availabilityKey);
}

function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h${m ? ` ${m}min` : ''}`;
}

export function HelperPool(props: Props) {
  const { helpers, tags, roleTags, statsByHelper, onCreateHelper } = props;
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return helpers.filter((h) => {
      if (q && !h.name.toLowerCase().includes(q)) return false;
      if (tagFilter && !h.tags.includes(tagFilter)) return false;
      return true;
    });
  }, [helpers, search, tagFilter]);

  const roleColor = (id: string | null) => roleTags.find((r) => r.id === id)?.color;
  const roleLabel = (id: string | null) => roleTags.find((r) => r.id === id)?.name;

  return (
    <View style={styles.pool}>
      <View style={styles.poolHeader}>
        <View style={styles.poolHeaderRow}>
          <Text style={styles.poolTitle}>Helfer-Pool</Text>
          <Pressable style={styles.smallButton} onPress={onCreateHelper}>
            <Text style={styles.smallButtonLabel}>+ Neuer Helfer</Text>
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Name suchen…"
          style={styles.searchInput}
        />
        <View style={styles.tagChips}>
          <TagChip label="Alle" active={tagFilter === null} onPress={() => setTagFilter(null)} />
          {[...new Set(tags.map((t) => t.name))].map((name) => (
            <TagChip key={name} label={name} active={tagFilter === name} onPress={() => setTagFilter(name)} />
          ))}
        </View>
      </View>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {filtered.map((h) => {
          const available = isHelperAvailable(h, props.availabilityKey);
          return props.dragEnabled ? (
            <DraggableHelperCard
              key={h.id}
              helper={h}
              roleColor={roleColor(h.roleTagId)}
              roleLabel={roleLabel(h.roleTagId)}
              stats={statsByHelper[h.id]}
              available={available}
            />
          ) : (
            <TappableHelperCard
              key={h.id}
              helper={h}
              roleColor={roleColor(h.roleTagId)}
              roleLabel={roleLabel(h.roleTagId)}
              stats={statsByHelper[h.id]}
              available={available}
              selected={props.selectedHelperId === h.id}
              onPress={() => props.onSelectHelper(props.selectedHelperId === h.id ? null : h.id)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

function TagChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tagChip, active && styles.tagChipActive]}>
      <Text style={[styles.tagChipLabel, active && styles.tagChipLabelActive]}>{label}</Text>
    </Pressable>
  );
}

function CardContent({
  helper,
  roleColor,
  roleLabel,
  stats,
}: {
  helper: Helper;
  roleColor?: string;
  roleLabel?: string;
  stats?: { count: number; minutes: number };
}) {
  return (
    <>
      <View style={styles.cardTop}>
        {roleLabel && (
          <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
            <Text style={styles.roleBadgeLabel}>{roleLabel}</Text>
          </View>
        )}
        <Text style={styles.cardName}>{helper.name}</Text>
      </View>
      <Text style={styles.cardTags}>{helper.tags.join(', ') || '—'}</Text>
      {stats && (
        <Text style={styles.cardStats}>
          {stats.count} {stats.count === 1 ? 'Schicht' : 'Schichten'} · {formatDuration(stats.minutes)}
        </Text>
      )}
    </>
  );
}

function DraggableHelperCard(props: {
  helper: Helper;
  roleColor?: string;
  roleLabel?: string;
  stats?: { count: number; minutes: number };
  available: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `helper:${props.helper.id}`,
    disabled: !props.available,
  });
  // A plain DOM element, not RN's <View> — react-native-web's View only
  // forwards a fixed prop allowlist and silently drops dnd-kit's pointer
  // listeners, so drag never activates. This component only ever renders
  // on web (see HelperPool's dragEnabled branch), so a raw <div> is safe.
  return (
    <div
      ref={setNodeRef}
      {...(props.available ? listeners : {})}
      {...attributes}
      style={{
        cursor: !props.available ? 'not-allowed' : isDragging ? 'grabbing' : 'grab',
        opacity: !props.available ? 0.4 : isDragging ? 0.5 : 1,
      }}
    >
      <View style={styles.card}>
        <CardContent {...props} />
        {!props.available && <Text style={styles.unavailableHint}>Nicht verfügbar an diesem Tag</Text>}
      </View>
    </div>
  );
}

function TappableHelperCard(props: {
  helper: Helper;
  roleColor?: string;
  roleLabel?: string;
  stats?: { count: number; minutes: number };
  available: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={!props.available}
      style={[styles.card, props.selected && styles.cardSelected, !props.available && styles.cardUnavailable]}
    >
      <CardContent {...props} />
      {!props.available && <Text style={styles.unavailableHint}>Nicht verfügbar an diesem Tag</Text>}
      {props.selected && <Text style={styles.selectedHint}>Jetzt eine Schicht antippen, um zuzuweisen</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pool: {
    width: 288,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.surface,
  },
  poolHeader: { padding: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  poolHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  poolTitle: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  smallButton: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7, borderWidth: 1, borderColor: colors.borderStrong },
  smallButtonLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
    backgroundColor: colors.surface,
  },
  tagChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, backgroundColor: colors.chipBg },
  tagChipActive: { backgroundColor: colors.accent },
  tagChipLabel: { fontSize: 11.5, fontWeight: '600', color: colors.textSecondary },
  tagChipLabelActive: { color: colors.accentContrast },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.surface,
  },
  cardDragging: { opacity: 0.5 },
  cardSelected: { borderColor: colors.accent, backgroundColor: colors.tealBg },
  cardUnavailable: { opacity: 0.4 },
  unavailableHint: { fontSize: 11, color: colors.danger, fontWeight: '500', marginTop: 6 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 13.5, fontWeight: '500', color: colors.textPrimary },
  cardTags: { fontSize: 11, color: colors.textSecondary, marginTop: 3 },
  cardStats: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  roleBadgeLabel: { fontSize: 10, fontWeight: '600', color: '#fff' },
  selectedHint: { fontSize: 11, color: colors.accent, fontWeight: '600', marginTop: 6 },
});
