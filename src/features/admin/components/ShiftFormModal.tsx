import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Picker } from '../../../components/Picker';
import type { EventTag, Shift } from '../../../shared/types';
import { colors } from '../../../shared/theme/colors';

export interface ShiftFormValue {
  name: string;
  description: string;
  tagId: string;
  start: string; // HH:MM
  end: string; // HH:MM
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function ShiftFormModal({
  visible,
  tags,
  editing,
  prefill,
  onClose,
  onSave,
}: {
  visible: boolean;
  tags: EventTag[];
  editing: Shift | null;
  /** Prefills the form for a new shift (e.g. from drag-to-create on the timeline). Ignored when `editing` is set. */
  prefill?: { tagId: string; start: string; end: string } | null;
  onClose: () => void;
  onSave: (value: ShiftFormValue) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagId, setTagId] = useState<string | null>(tags[0]?.id ?? null);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('14:00');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (editing) {
      setName(editing.name);
      setDescription(editing.description);
      setTagId(editing.tagId);
      setStart(new Date(editing.startTime).toTimeString().slice(0, 5));
      setEnd(new Date(editing.endTime).toTimeString().slice(0, 5));
    } else {
      setName('');
      setDescription('');
      setTagId(prefill?.tagId ?? tags[0]?.id ?? null);
      setStart(prefill?.start ?? '10:00');
      setEnd(prefill?.end ?? '14:00');
    }
    setError(null);
  }, [visible, editing, tags, prefill]);

  async function handleSave() {
    if (!name.trim()) return setError('Name darf nicht leer sein.');
    if (!tagId) return setError('Bitte eine Spalte wählen.');
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) return setError('Uhrzeit im Format HH:MM angeben.');
    if (start === end) return setError('Start und Ende dürfen nicht gleich sein.');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim(), tagId, start, end });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>{editing ? 'Schicht bearbeiten' : 'Neue Schicht'}</Text>
      <View style={{ gap: 12 }}>
        <Field label="Name">
          <TextInput value={name} onChangeText={setName} style={styles.input} />
        </Field>
        <Field label="Beschreibung">
          <TextInput value={description} onChangeText={setDescription} style={styles.input} />
        </Field>
        <Field label="Tag">
          <Picker value={tagId} options={tags.map((t) => ({ value: t.id, label: t.name }))} onChange={setTagId} />
        </Field>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field label="Start">
              <TextInput value={start} onChangeText={setStart} placeholder="HH:MM" style={styles.input} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ende">
              <TextInput value={end} onChangeText={setEnd} placeholder="HH:MM" style={styles.input} />
            </Field>
          </View>
        </View>
        <Text style={styles.hint}>
          Endet die Schicht nach Mitternacht? Einfach eine Uhrzeit vor dem Start eingeben (z. B. 20:00–01:00) — gilt
          automatisch als nächster Tag.
        </Text>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.footer}>
        <Button label="Abbrechen" variant="secondary" onPress={onClose} />
        <Button label="Speichern" variant="primary" onPress={handleSave} disabled={saving} />
      </View>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: colors.textPrimary },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.textSecondary, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
    backgroundColor: colors.surface,
  },
  hint: { fontSize: 12, color: colors.textSecondary, lineHeight: 16 },
  error: { fontSize: 12.5, color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
});
