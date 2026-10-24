import { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

export const SectionCard = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: ComponentProps<typeof View>['style'];
}) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
