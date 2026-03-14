import { colors } from '../constants/colors';
import { radii, spacing } from '../constants/spacing';

export const theme = {
  colors,
  spacing,
  radii,
  typography: {
    title: {
      fontSize: 30,
      fontWeight: '700' as const,
      lineHeight: 36,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 22,
    },
    caption: {
      fontSize: 13,
      fontWeight: '500' as const,
      lineHeight: 18,
    },
  },
} as const;
