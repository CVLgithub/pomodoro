import { ComponentRef, forwardRef } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { themedStyles } from '../../theme/runtime';

interface TextFieldProps extends TextInputProps {
  label?: string;
  helperText?: string;
}

export const TextField = forwardRef<ComponentRef<typeof TextInput>, TextFieldProps>(
  ({ label, helperText, style, ...props }, ref) => (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, style]}
        {...props}
      />
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  ),
);

TextField.displayName = 'TextField';

const styles = themedStyles(() => ({
  container: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 4,
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.surfaceElevated,
    color: colors.textPrimary,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
  },
  helper: {
    color: colors.textMuted,
    fontSize: 13,
  },
}));
