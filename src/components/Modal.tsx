import React from 'react';
import { Modal as RNModal, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '../shared/theme/colors';

export function Modal({
  visible,
  onClose,
  width = 420,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  if (!visible) return null;
  return (
    <RNModal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.card, { width }]} onPress={(e) => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
  },
});
