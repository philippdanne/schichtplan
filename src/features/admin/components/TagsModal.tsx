import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import type { EventTag } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

export function TagsModal({
  visible,
  eventName,
  tags,
  usageByTag,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  visible: boolean;
  eventName: string;
  tags: EventTag[];
  usageByTag: Record<string, number>;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [error, setError] = useState<string | null>(null);

  const valueFor = (tag: EventTag) => drafts[tag.id] ?? tag.name;

  async function commitRename(tag: EventTag) {
    const name = (drafts[tag.id] ?? tag.name).trim();
    if (!name || name === tag.name) return;
    if (tags.some((t) => t.id !== tag.id && t.name === name)) {
      setError('Spaltennamen müssen eindeutig sein.');
      return;
    }
    setError(null);
    try {
      await onRename(tag.id, name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Umbenennen.');
    }
  }

  async function handleDelete(tag: EventTag) {
    setError(null);
    try {
      await onDelete(tag.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fehler beim Löschen.');
    }
  }

  async function handleAdd() {
    const name = newTag.trim();
    if (!name) return;
    if (tags.some((t) => t.name === name)) {
      setError('Spaltennamen müssen eindeutig sein.');
      return;
    }
    setError(null);
    await onCreate(name);
    setNewTag('');
  }

  return (
    <Modal visible={visible} onClose={onClose} width={420}>
      <Text style={styles.title}>Spalten verwalten</Text>
      <Text style={styles.subtitle}>{eventName}</Text>
      <View style={{ gap: 8 }}>
        {tags.map((tag) => {
          const usage = usageByTag[tag.id] ?? 0;
          return (
            <View key={tag.id} style={styles.row}>
              <TextInput
                value={valueFor(tag)}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [tag.id]: v }))}
                onBlur={() => commitRename(tag)}
                onSubmitEditing={() => commitRename(tag)}
                style={styles.input}
              />
              {usage > 0 && <Text style={styles.usage}>{usage} Schichten</Text>}
              <Pressable
                onPress={() => handleDelete(tag)}
                disabled={usage > 0}
                style={[styles.deleteButton, usage > 0 && styles.deleteButtonDisabled]}
              >
                <Text style={styles.deleteButtonLabel}>✕</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
      <View style={styles.addRow}>
        <TextInput value={newTag} onChangeText={setNewTag} placeholder="Neue Spalte…" style={styles.input} />
        <Button label="+ Hinzufügen" onPress={handleAdd} />
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.footer}>
        <Button label="Fertig" variant="primary" onPress={onClose} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13.5,
    backgroundColor: colors.surface,
  },
  usage: { fontSize: 11, color: colors.textSecondary, flexShrink: 0 },
  deleteButton: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  deleteButtonDisabled: { opacity: 0.4 },
  deleteButtonLabel: { fontSize: 11, color: colors.textSecondary },
  addRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  error: { fontSize: 12.5, color: colors.danger, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
});
