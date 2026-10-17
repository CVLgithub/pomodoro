import { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { Ionicon } from './Ionicon';

type RoundVariant = 'primary' | 'neutral' | 'danger';

interface RoundButtonProps {
  icon: ComponentProps<typeof Ionicon>['name'];
  label: string;
  onPress: () => void;
  variant?: RoundVariant;
  size?: 'md' | 'lg';
}

export const RoundButton = ({
  icon,
  label,
  onPress,
  variant = 'neutral',
  size = 'md',
}: RoundButtonProps) => {
  const diameter = size === 'lg' ? 88 : 60;
  const iconColor =
    variant === 'primary' ? '#1A0B06' : variant === 'danger' ? colors.danger : colors.textPrimary;
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.circle,
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
          variant === 'primary' ? styles.primary : null,
          variant === 'neutral' ? styles.neutral : null,
          variant === 'danger' ? styles.danger : null,
          pressed ? styles.pressed : null,
        ]}
      >
        <Ionicon name={icon} color={iconColor} size={size === 'lg' ? 34 : 24} />
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: spacing.sm },
  circle: { alignItems: 'center', justifyContent: 'center' },
  primary: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  neutral: { backgroundColor: colors.surfaceElevated },
  danger: { backgroundColor: 'rgba(255, 92, 108, 0.14)' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
});
