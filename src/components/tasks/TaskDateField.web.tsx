import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

interface TaskDateFieldProps {
  date: string | null;
  isPickerVisible: boolean;
  onTogglePicker: () => void;
  onChangeDate: (date: string | null) => void;
  label?: string;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const normalizeDateKey = (value: string): string | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!DATE_KEY_PATTERN.test(trimmed)) {
    return null;
  }

  const [year, month, day] = trimmed.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return trimmed;
};

export const TaskDateField = ({
  date,
  isPickerVisible,
  onTogglePicker,
  onChangeDate,
  label = 'Datum',
}: TaskDateFieldProps) => {
  const [draft, setDraft] = useState(date ?? '');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    setDraft(date ?? '');
    setErrorText(null);
  }, [date, isPickerVisible]);

  const handleApply = () => {
    const normalized = normalizeDateKey(draft);

    if (draft.trim() && !normalized) {
      setErrorText('Bitte nutze das Format YYYY-MM-DD.');
      return;
    }

    onChangeDate(normalized);
    onTogglePicker();
  };

  const handleCancel = () => {
    setDraft(date ?? '');
    setErrorText(null);
    onTogglePicker();
  };

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selector}>
        <Text style={styles.value}>{date ?? 'Kein Datum gesetzt'}</Text>
        <View style={styles.rowActions}>
          <Button
            label={isPickerVisible ? 'Schließen' : 'Ändern'}
            variant="ghost"
            onPress={isPickerVisible ? handleCancel : onTogglePicker}
          />
          {date ? (
            <Button label="Entfernen" variant="ghost" onPress={() => onChangeDate(null)} />
          ) : null}
        </View>
      </View>
      {isPickerVisible ? (
        <View style={styles.editor}>
          <TextField
            label={label}
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              if (errorText) {
                setErrorText(null);
              }
            }}
            placeholder="2026-04-04"
            autoCapitalize="none"
            autoCorrect={false}
            helperText={errorText ?? 'Format YYYY-MM-DD. Leer lassen entfernt das Datum.'}
          />
          <View style={styles.rowActions}>
            <Button label="Übernehmen" onPress={handleApply} />
            <Button label="Abbrechen" variant="secondary" onPress={handleCancel} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fieldBlock: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  value: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  editor: {
    gap: spacing.sm,
  },
});
