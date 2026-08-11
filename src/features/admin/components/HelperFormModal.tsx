import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import type { EventTag, RoleTag } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

export function HelperFormModal({
  visible,
  tags,
  roleTags,
  onClose,
  onSave,
}: {
  visible: boolean;
  tags: EventTag[];
  roleTags: RoleTag[];
  onClose: () => void;
  onSave: (value: { name: string; tags: string[]; roleTagId: string | null }) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [roleTagId, setRoleTagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setSelectedTags([]);
      setRoleTagId(null);
      setError(null);
    }
  }, [visible]);

  function toggleTag(name: string) {
    setSelectedTags((cur) => (cur.includes(name) ? cur.filter((t) => t !== name) : [...cur, name]));
  }

  async function handleSave() {
    if (!name.trim()) return setError('Name darf nicht leer sein.');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), tags: selectedTags, roleTagId });
    } finally {
      setSaving(false);
    }
  }

  const tagNames = [...new Set(tags.map((t) => t.name))];

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
            {roleTags.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setRoleTagId(roleTagId === r.id ? null : r.id)}
                style={[styles.roleChip, { backgroundColor: r.color }, roleTagId === r.id && styles.roleChipActive]}
              >
                <Text style={styles.roleChipLabel}>{r.name}</Text>
              </Pressable>
            ))}
          </View>
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
  error: { fontSize: 12.5, color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
});
