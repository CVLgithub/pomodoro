import { ReactNode } from 'react';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { Glass } from './Glass';

export const SectionCard = ({
  children,
  style,
}: {
  children: ReactNode;
  style?: ComponentProps<typeof View>['style'];
}) => (
  <Glass radius={26} style={[styles.card, style]}>
    {children}
  </Glass>
);

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 12,
  },
});
