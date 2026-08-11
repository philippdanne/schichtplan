import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { colors } from '../../../shared/theme/colors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function EventFormModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (value: { name: string; startDate: string; endDate: string }) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setStart('');
      setEnd('');
      setError(null);
    }
  }, [visible]);

  async function handleSave() {
    if (!name.trim()) return setError('Veranstaltungsname darf nicht leer sein.');
    if (!DATE_RE.test(start) || !DATE_RE.test(end)) return setError('Datum im Format JJJJ-MM-TT angeben.');
    if (start > end) return setError('Enddatum muss nach dem Startdatum liegen.');
    setSaving(true);
    try {
      await onSave({ name: name.trim(), startDate: start, endDate: end });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Neues Event anlegen</Text>
      <Text style={styles.subtitle}>Angemeldet als Admin</Text>
      <View style={{ gap: 12 }}>
        <View>
          <Text style={styles.label}>Veranstaltungsname</Text>
          <TextInput value={name} onChangeText={setName} placeholder="z. B. Frühlingsfest" style={styles.input} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Startdatum</Text>
            <TextInput value={start} onChangeText={setStart} placeholder="JJJJ-MM-TT" style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Enddatum</Text>
            <TextInput value={end} onChangeText={setEnd} placeholder="JJJJ-MM-TT" style={styles.input} />
          </View>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
      <View style={styles.footer}>
        <Button label="Abbrechen" variant="secondary" onPress={onClose} />
        <Button label="Event anlegen" variant="primary" onPress={handleSave} disabled={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 4, color: colors.textPrimary },
  subtitle: { fontSize: 12.5, color: colors.textSecondary, marginBottom: 16 },
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
  error: { fontSize: 12.5, color: colors.danger },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
});
