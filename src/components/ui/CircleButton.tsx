import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

interface CircleButtonProps {
  icon: ComponentProps<typeof Ionicons>['name'];
  /** Beschreibung für Screenreader, da die Taste nur ein Symbol zeigt. */
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'glass';
  size?: number;
  disabled?: boolean;
}

export const CircleButton = ({
  icon,
  label,
  onPress,
  variant = 'glass',
  size = 44,
  disabled = false,
}: CircleButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    disabled={disabled}
    onPress={onPress}
    style={({ pressed }) => [
      styles.base,
      { width: size, height: size, borderRadius: size / 2 },
      variant === 'primary' ? styles.primary : styles.glass,
      pressed && !disabled ? styles.pressed : null,
      disabled ? styles.disabled : null,
    ]}
  >
    <Ionicons
      name={icon}
      size={Math.round(size * 0.46)}
      color={variant === 'primary' ? colors.onAccent : colors.textPrimary}
    />
  </Pressable>
);

const styles = themedStyles(() => ({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  primary: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  glass: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.glassLine,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  disabled: {
    opacity: 0.45,
  },
}));
