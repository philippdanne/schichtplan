import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../shared/theme/colors';

export interface PickerOption {
  value: string;
  label: string;
}

export function Picker({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: PickerOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.control} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.label}>{current?.label ?? '—'}</Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && (
        <View style={styles.menu}>
          {options.map((opt) => (
            <Pressable
              key={opt.value}
              style={[styles.option, opt.value === value && styles.optionActive]}
              onPress={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', zIndex: 20 },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 160,
  },
  label: { fontSize: 14, fontWeight: '500', color: colors.textPrimary, flex: 1 },
  chevron: { fontSize: 10, color: colors.textSecondary },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  option: { paddingHorizontal: 12, paddingVertical: 9 },
  optionActive: { backgroundColor: colors.chipBg },
  optionLabel: { fontSize: 14, color: colors.textPrimary },
});
