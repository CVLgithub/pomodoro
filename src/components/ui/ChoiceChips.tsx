import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

export interface ChoiceChipOption<T extends string | number> {
  value: T;
  label: string;
  /** Farbpunkt vor der Beschriftung. */
  color?: string;
}

interface ChoiceChipsProps<T extends string | number> {
  options: readonly ChoiceChipOption<T>[];
  /** Gewählte Werte; bei Einfachauswahl höchstens einer. */
  selected: readonly T[];
  onToggle: (value: T) => void;
  /** Mehrfachauswahl (Kontrollkästchen) statt Einfachauswahl (Optionsfelder). */
  multiple?: boolean;
  disabled?: boolean;
}

/** Auswahl als Reihe umbrechender Chips. */
export const ChoiceChips = <T extends string | number>({
  options,
  selected,
  onToggle,
  multiple = false,
  disabled = false,
}: ChoiceChipsProps<T>) => (
  <View style={styles.chips} accessibilityRole={multiple ? undefined : 'radiogroup'}>
    {options.map((option) => {
      const isSelected = selected.includes(option.value);

      return (
        <Pressable
          key={option.value}
          accessibilityRole={multiple ? 'checkbox' : 'radio'}
          accessibilityState={
            multiple ? { checked: isSelected, disabled } : { selected: isSelected, disabled }
          }
          disabled={disabled}
          onPress={() => onToggle(option.value)}
          style={[
            styles.chip,
            isSelected ? styles.chipSelected : null,
            disabled ? styles.disabled : null,
          ]}
        >
          {option.color ? <View style={[styles.dot, { backgroundColor: option.color }]} /> : null}
          <Text style={[styles.label, isSelected ? styles.labelSelected : null]}>{option.label}</Text>
        </Pressable>
      );
    })}
  </View>
);

const styles = themedStyles(() => ({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 40,
    minWidth: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.surfaceElevated,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.5,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
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
