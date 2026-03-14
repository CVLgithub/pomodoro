import { StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

interface DurationWheelPickerProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const DurationWheelPicker = ({
  label,
  value,
  onChange,
  disabled,
}: DurationWheelPickerProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.pickerWrap}>
      <Picker
        style={styles.picker}
        enabled={!disabled}
        selectedValue={value}
        itemStyle={styles.item}
        onValueChange={(nextValue) => onChange(Number(nextValue))}
      >
        {Array.from({ length: 60 }, (_, index) => index + 1).map((minutes) => (
          <Picker.Item key={minutes} label={String(minutes).padStart(2, '0')} value={minutes} />
        ))}
      </Picker>
    </View>
    <Text style={styles.unit}>Min</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerWrap: {
    height: 170,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  picker: {
    width: '100%',
  },
  item: {
    color: colors.textPrimary,
    fontSize: 18,
  },
  unit: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
