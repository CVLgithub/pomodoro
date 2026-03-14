import { Pressable, StyleSheet, View } from 'react-native';

import { colors, tagPalette } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorSwatchPicker = ({
  value,
  onChange,
}: ColorSwatchPickerProps) => (
  <View style={styles.row}>
    {tagPalette.map((color) => {
      const selected = color === value;
      return (
        <Pressable
          key={color}
          onPress={() => onChange(color)}
          style={[
            styles.swatch,
            { backgroundColor: color },
            selected ? styles.selected : null,
          ]}
        />
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: colors.textPrimary,
    transform: [{ scale: 1.08 }],
  },
});
