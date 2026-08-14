import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { colors } from '../../../shared/theme/colors';

export function AblaufplanModal({
  visible,
  eventName,
  initialText,
  onClose,
  onSave,
}: {
  visible: boolean;
  eventName: string;
  initialText: string;
  onClose: () => void;
  onSave: (text: string) => Promise<void> | void;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setText(initialText);
  }, [visible, initialText]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} onClose={onClose} width={560}>
      <Text style={styles.title}>Ablaufplan – {eventName}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={'z. B.\n08:00 Aufbau beginnt\n16:00 Fassanstich\n23:00 Bierwagen schließt'}
        multiline
        numberOfLines={12}
        style={styles.textarea}
      />
      <View style={styles.footer}>
        <Button label="Abbrechen" variant="secondary" onPress={onClose} />
        <Button label="Speichern" variant="primary" onPress={handleSave} disabled={saving} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: colors.textPrimary },
  textarea: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    padding: 12,
    fontSize: 13.5,
    backgroundColor: colors.surface,
    minHeight: 220,
    textAlignVertical: 'top',
  },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
});
