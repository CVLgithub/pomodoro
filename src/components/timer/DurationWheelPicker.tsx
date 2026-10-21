import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
}: DurationWheelPickerProps) => {
  const [inputValue, setInputValue] = useState(String(value).padStart(2, '0'));
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(String(value).padStart(2, '0'));
    }
  }, [isEditing, value]);

  const commitInputValue = () => {
    const parsedValue = Number.parseInt(inputValue, 10);
    const nextValue = Number.isNaN(parsedValue) ? value : Math.min(60, Math.max(1, parsedValue));

    setInputValue(String(nextValue).padStart(2, '0'));
    onChange(nextValue);
    setIsEditing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === 'web' ? (
        <View style={styles.webPicker}>
          <Pressable
            accessibilityLabel={`${label} verringern`}
            accessibilityRole="button"
            disabled={disabled || value <= 1}
            onPress={() => onChange(Math.max(1, value - 1))}
            style={({ pressed }) => [
              styles.stepButton,
              pressed && !disabled ? styles.stepButtonPressed : null,
              disabled || value <= 1 ? styles.disabled : null,
            ]}
          >
            <Text style={styles.stepButtonLabel}>−</Text>
          </Pressable>
          <View style={styles.valueBlock}>
            <TextInput
              accessibilityLabel={`${label} in Minuten`}
              editable={!disabled}
              keyboardType="number-pad"
              maxLength={2}
              onBlur={commitInputValue}
              onChangeText={(text) => setInputValue(text.replace(/\D/g, ''))}
              onFocus={() => setIsEditing(true)}
              onSubmitEditing={commitInputValue}
              selectTextOnFocus
              style={styles.valueInput}
              value={inputValue}
            />
            <Text style={styles.valueUnit}>Minuten</Text>
          </View>
          <Pressable
            accessibilityLabel={`${label} erhöhen`}
            accessibilityRole="button"
            disabled={disabled || value >= 60}
            onPress={() => onChange(Math.min(60, value + 1))}
            style={({ pressed }) => [
              styles.stepButton,
              pressed && !disabled ? styles.stepButtonPressed : null,
              disabled || value >= 60 ? styles.disabled : null,
            ]}
          >
            <Text style={styles.stepButtonLabel}>+</Text>
          </Pressable>
        </View>
      ) : (
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
      )}
      {Platform.OS !== 'web' ? <Text style={styles.unit}>Min</Text> : null}
    </View>
  );
};

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
  webPicker: {
    height: 170,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  stepButton: {
    width: 58,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  stepButtonPressed: {
    backgroundColor: colors.accentMuted,
  },
  stepButtonLabel: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '400',
    lineHeight: 30,
  },
  valueBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  valueInput: {
    width: 76,
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
    padding: 0,
    textAlign: 'center',
  },
  valueUnit: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  disabled: {
    opacity: 0.45,
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
