import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

interface StatSummaryCardProps {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}

export const StatSummaryCard = ({ label, value, style }: StatSummaryCardProps) => (
  <View style={[styles.card, style]}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 100,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
});
