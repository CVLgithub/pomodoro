import DateTimePicker from '@react-native-community/datetimepicker';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { formatDateKey } from '../../utils/date';
import { Button } from '../ui/Button';

interface TaskDateFieldProps {
  date: string | null;
  isPickerVisible: boolean;
  onTogglePicker: () => void;
  onChangeDate: (date: string | null) => void;
}

export const TaskDateField = ({
  date,
  isPickerVisible,
  onTogglePicker,
  onChangeDate,
}: TaskDateFieldProps) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.label}>Datum</Text>
    <View style={styles.selector}>
      <Text style={styles.value}>{date ?? 'Kein Datum gesetzt'}</Text>
      <View style={styles.rowActions}>
        <Button label="Aendern" variant="ghost" onPress={onTogglePicker} />
        {date ? (
          <Button label="Entfernen" variant="ghost" onPress={() => onChangeDate(null)} />
        ) : null}
      </View>
    </View>
    {isPickerVisible ? (
      <DateTimePicker
        value={date ? new Date(`${date}T12:00:00`) : new Date()}
        mode="date"
        display="spinner"
        themeVariant="dark"
        onChange={(_, selectedDate) => {
          if (!selectedDate) {
            return;
          }

          onChangeDate(formatDateKey(selectedDate));
        }}
      />
    ) : null}
  </View>
);

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
});
