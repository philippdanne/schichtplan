import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { colors } from '../../../shared/theme/colors';

export function ShareLinkModal({
  visible,
  eventName,
  link,
  onClose,
}: {
  visible: boolean;
  eventName: string;
  link: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-HTTPS context) — the
      // link is still shown in a selectable field below as a fallback.
    }
  }

  return (
    <Modal visible={visible} onClose={onClose} width={480}>
      <Text style={styles.title}>An Helfer teilen – {eventName}</Text>
      <Text style={styles.hint}>
        Wer diesen Link öffnet, sieht den Schichtplan für dieses Event — ohne Anmeldung, nur lesend.
      </Text>
      <TextInput value={link} editable={false} selectTextOnFocus style={styles.linkInput} />
      <View style={styles.footer}>
        <Button label="Schließen" variant="secondary" onPress={onClose} />
        <Button label={copied ? 'Kopiert ✓' : 'Link kopieren'} variant="primary" onPress={handleCopy} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: colors.textPrimary },
  hint: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  linkInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    backgroundColor: colors.chipBg,
    color: colors.textPrimary,
  },
  footer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
});
