import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { colors } from '../../constants/colors';
import { Ionicon } from './Ionicon';

interface IconButtonProps {
  name: ComponentProps<typeof Ionicon>['name'];
  onPress: () => void;
  accessibilityLabel: string;
}

export const IconButton = ({ name, onPress, accessibilityLabel }: IconButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    style={({ pressed }) => [styles.base, pressed ? styles.pressed : null]}
  >
    <Ionicon name={name} color={colors.textSecondary} size={22} />
  </Pressable>
);

const styles = StyleSheet.create({
  base: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
