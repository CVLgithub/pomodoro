import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { tagPalette } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const COLOR_NAMES: Record<string, string> = {
  '#5EA2FF': 'Blau',
  '#46C37B': 'Grün',
  '#FFB655': 'Orange',
  '#FF6B6B': 'Rot',
  '#B68BFF': 'Violett',
  '#50C5D7': 'Türkis',
  '#F28CC6': 'Rosa',
  '#9BE564': 'Hellgrün',
};

export const ColorSwatchPicker = ({ value, onChange, disabled = false }: ColorSwatchPickerProps) => (
  <View style={styles.row} accessibilityRole="radiogroup">
    {tagPalette.map((color) => {
      const selected = color === value;

      return (
        <Pressable
          key={color}
          accessibilityRole="radio"
          accessibilityLabel={COLOR_NAMES[color] ?? color}
          accessibilityState={{ selected, disabled }}
          disabled={disabled}
          onPress={() => onChange(color)}
          style={[styles.swatch, { backgroundColor: color }, disabled ? styles.disabled : null]}
        >
          {selected ? <Ionicons name="checkmark" size={22} color="#0B0B0F" /> : null}
        </Pressable>
      );
    })}
  </View>
);

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
}));
