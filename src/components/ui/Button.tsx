import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.base,
      variantStyles[variant],
      pressed && !disabled ? styles.pressed : null,
      disabled ? styles.disabled : null,
    ]}
  >
    <View style={styles.content}>
      {icon}
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: 'rgba(255, 107, 107, 0.16)',
    borderColor: 'rgba(255, 107, 107, 0.35)',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: colors.background,
  },
  secondary: {
    color: colors.textPrimary,
  },
  ghost: {
    color: colors.textSecondary,
  },
  danger: {
    color: colors.danger,
  },
});

