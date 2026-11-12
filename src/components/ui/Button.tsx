import { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: ReactNode;
  /** Kompakte Höhe für Kopfzeilen und Zeilenaktionen. */
  compact?: boolean;
}

export const Button = ({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  compact = false,
}: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.base,
      compact ? styles.compact : null,
      styles[variant],
      pressed && !disabled ? styles.pressed : null,
      disabled ? styles.disabled : null,
    ]}
  >
    <View style={styles.content}>
      {icon}
      <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
    </View>
  </Pressable>
);

const styles = themedStyles(() => ({
  base: {
    minHeight: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  compact: {
    minHeight: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassLine,
  },
  ghost: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassLine,
  },
  danger: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassLine,
  },
  primaryLabel: {
    color: colors.onAccent,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  ghostLabel: {
    color: colors.textPrimary,
  },
  dangerLabel: {
    color: colors.danger,
  },
}));
