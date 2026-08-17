import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../shared/theme/colors';

export type Mode = 'admin' | 'helfer';

export function Header({ mode, onModeChange }: { mode: Mode; onModeChange: (m: Mode) => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.title}>Schichtplaner</Text>
      <View style={styles.tabs}>
        <Tab label="Admin" active={mode === 'admin'} onPress={() => onModeChange('admin')} />
        <Tab label="Helfer" active={mode === 'helfer'} onPress={() => onModeChange('helfer')} />
      </View>
      <View style={styles.spacer} />
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  tabs: { flexDirection: 'row', gap: 4, backgroundColor: colors.chipBg, padding: 4, borderRadius: 10 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: colors.surface },
  tabLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabLabelActive: { color: colors.textPrimary },
  spacer: { width: 120 },
});
