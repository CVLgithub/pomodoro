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
    minHeight: 52,
    borderRadius: radii.pill,
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
    fontWeight: '700',
    letterSpacing: 0.2,
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
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
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
    backgroundColor: 'rgba(255, 92, 108, 0.16)',
    borderColor: 'rgba(255, 92, 108, 0.35)',
  },
});

const labelStyles = StyleSheet.create({
  primary: {
    color: '#1A0B06',
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

