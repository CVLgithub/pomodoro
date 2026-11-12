import { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { themedStyles } from '../../theme/runtime';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export const EmptyState = ({ title, description, icon }: EmptyStateProps) => (
  <View style={styles.container}>
    {icon}
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = themedStyles(() => ({
  container: {
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}));

