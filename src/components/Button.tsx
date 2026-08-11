import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../shared/theme/colors';

type Variant = 'primary' | 'secondary' | 'danger';

export function Button({
  label,
  onPress,
  variant = 'secondary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, variantStyles[variant], disabled && styles.disabled]}
    >
      <Text style={[styles.label, variant === 'primary' && styles.labelPrimary]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  labelPrimary: { color: colors.accentContrast },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.accent, borderWidth: 0 },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  danger: { backgroundColor: colors.danger, borderWidth: 0 },
});
