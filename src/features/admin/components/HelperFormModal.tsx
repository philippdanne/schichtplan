import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import type { EventTag, RoleTag } from '../../../shared/types';
import { colors, swatches } from '../../../shared/theme/colors';

export interface AvailabilityOption {
  key: string;
  label: string;
}

export function HelperFormModal({
  visible,
  tags,
  roleTags,
  availabilityOptions,
  onClose,
  onSave,
  onCreateRoleTag,
}: {
  visible: boolean;
  tags: EventTag[];
  roleTags: RoleTag[];
  availabilityOptions: AvailabilityOption[];
  onClose: () => void;
  onSave: (value: { name: string; tags: string[]; roleTagId: string | null; availability: string[] | null }) => Promise<void> | void;
  onCreateRoleTag: (name: string, color: string) => Promise<RoleTag>;
}) {
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [roleTagId, setRoleTagId] = useState<string | null>(null);
  const [localRoleTags, setLocalRoleTags] = useState<RoleTag[]>(roleTags);
  const [newRoleTagLabel, setNewRoleTagLabel] = useState('');
  const [newRoleTagColor, setNewRoleTagColor] = useState(swatches[0]);
  const [availability, setAvailability] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setSelectedTags([]);
      setRoleTagId(null);
      setLocalRoleTags(roleTags);
      setNewRoleTagLabel('');
      setNewRoleTagColor(swatches[0]);
      setAvailability(null);
      setError(null);
    }
  }, [visible, roleTags]);

  function toggleTag(name: string) {
    setSelectedTags((cur) => (cur.includes(name) ? cur.filter((t) => t !== name) : [...cur, name]));
  }

  function toggleAvailability(key: string) {
    setAvailability((cur) => {
      const allKeys = availabilityOptions.map((o) => o.key);
      const arr = cur === null ? [...allKeys] : [...cur];
      const idx = arr.indexOf(key);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(key);
      return arr.length === allKeys.length ? null : arr;
    });
  }

  async function handleAddRoleTag() {
    const label = newRoleTagLabel.trim();
    if (!label) return;
    const created = await onCreateRoleTag(label, newRoleTagColor);
    setLocalRoleTags((cur) => [...cur, created]);
    setRoleTagId(created.id);
    setNewRoleTagLabel('');
  }

  async function handleSave() {
    if (!name.trim()) return setError('Name darf nicht leer sein.');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), tags: selectedTags, roleTagId, availability });
    } finally {
      setSaving(false);
    }
  }

  const tagNames = [...new Set(tags.map((t) => t.name))];
  const isAvailable = (key: string) => availability === null || availability.includes(key);

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Neuer Helfer</Text>
      <View style={{ gap: 14 }}>
        <View>
          <Text style={styles.label}>Name</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} />
        </View>
        <View>
          <Text style={styles.label}>Tätigkeits-Tags</Text>
          <View style={styles.chipRow}>
            {tagNames.map((t) => (
              <Pressable
                key={t}
                onPress={() => toggleTag(t)}
                style={[styles.chip, selectedTags.includes(t) && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, selectedTags.includes(t) && styles.chipLabelActive]}>{t}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View>
          <Text style={styles.label}>Rolle</Text>
          <View style={styles.chipRow}>
            {localRoleTags.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRoleTagId(roleTagId === r.id ? null : r.id)}
                style={[styles.roleChip, { backgroundColor: r.color }, roleTagId === r.id && styles.roleChipActive]}
              >
                <Text style={styles.roleChipLabel}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.newRoleRow}>
            <TextInput
              value={newRoleTagLabel}
              onChangeText={setNewRoleTagLabel}
              placeholder="Neuer Rollen-Tag…"
              style={[styles.input, { flex: 1 }]}
            />
            {swatches.map((c) => (
              <Pressable
                key={c}
                onPress={() => setNewRoleTagColor(c)}
                style={[styles.swatch, { backgroundColor: c }, newRoleTagColor === c && styles.swatchSelected]}
              />
            ))}
            <Button label="+ Tag" onPress={handleAddRoleTag} />
          </View>
        </View>
        <View>
          <Text style={styles.label}>Verfügbarkeit</Text>
          <ScrollView style={styles.availabilityList}>
            {availabilityOptions.map((opt) => (
              <Pressable key={opt.key} style={styles.availabilityRow} onPress={() => toggleAvailability(opt.key)}>
                <View style={[styles.checkbox, isAvailable(opt.key) && styles.checkboxChecked]}>
                  {isAvailable(opt.key) && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={styles.availabilityLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.footer}>
        <Button label="Abbrechen" variant="secondary" onPress={onClose} />
        <Button label="Helfer anlegen" variant="primary" onPress={handleSave} disabled={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: colors.textPrimary },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 7 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.chipBg },
  chipActive: { backgroundColor: colors.accent },
  chipLabel: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary },
  chipLabelActive: { color: colors.accentContrast },
  roleChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, opacity: 0.55 },
  roleChipActive: { opacity: 1 },
  roleChipLabel: { fontSize: 12.5, fontWeight: '600', color: '#fff' },
  newRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  swatchSelected: { borderWidth: 2, borderColor: colors.textPrimary },
  availabilityList: { maxHeight: 140 },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkboxMark: { fontSize: 10, color: '#fff', fontWeight: '700' },
  availabilityLabel: { fontSize: 12.5, color: colors.textPrimary },
  error: { fontSize: 12.5, color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
});
