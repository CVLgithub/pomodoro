import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

export const SectionCard = ({ children }: { children: ReactNode }) => (
  <View style={styles.card}>{children}</View>
);

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

