import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

interface TagPillProps {
  label: string;
  color: string;
}

export const TagPill = ({ label, color }: TagPillProps) => (
  <View style={styles.container}>
    <View style={[styles.dot, { backgroundColor: color }]} />
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

