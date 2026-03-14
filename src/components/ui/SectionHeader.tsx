import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export const SectionHeader = ({ title, subtitle, action }: SectionHeaderProps) => (
  <View style={styles.row}>
    <View style={styles.textBlock}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
    {action}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

