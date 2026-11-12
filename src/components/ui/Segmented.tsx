import { Pressable, Text } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Glass } from './Glass';

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** Beschreibung der Auswahl für Screenreader. */
  label: string;
}

export const Segmented = <T extends string>({ options, value, onChange, label }: SegmentedProps<T>) => (
  <Glass radius={22} style={styles.container} accessibilityRole="tablist" accessibilityLabel={label}>
    {options.map((option) => {
      const selected = option.value === value;

      return (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected }}
          onPress={() => onChange(option.value)}
          style={[styles.segment, selected ? styles.segmentSelected : null]}
        >
          <Text style={[styles.label, selected ? styles.labelSelected : null]}>{option.label}</Text>
        </Pressable>
      );
    })}
  </Glass>
);

const styles = themedStyles(() => ({
  container: {
    flexDirection: 'row',
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  labelSelected: {
    color: colors.onAccent,
  },
}));
