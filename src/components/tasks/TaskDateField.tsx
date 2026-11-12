import { useState } from 'react';
import { Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { colors } from '../../constants/colors';
import { getPalette, themedStyles } from '../../theme/runtime';
import { formatDateKey, getTodayDateKey } from '../../utils/date';
import { ChoiceChips } from '../ui/ChoiceChips';
import { DateChoice, buildDateChoiceOptions, getDateChoice, getTomorrowDateKey } from './dateChoices';

export interface TaskDateFieldProps {
  date: string | null;
  onChangeDate: (date: string | null) => void;
  label?: string;
  /** Bietet "Kein Datum" an. Wiederholende Aufgaben brauchen ein Startdatum. */
  allowClear?: boolean;
}

/** Datumswahl mit Schnellauswahl; der Kalender erscheint nur für "Anderes Datum". */
export const TaskDateField = ({
  date,
  onChangeDate,
  label = 'Datum',
  allowClear = true,
}: TaskDateFieldProps) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const choose = (choice: DateChoice) => {
    if (choice === 'other') {
      setPickerVisible((visible) => !visible);
      return;
    }

    setPickerVisible(false);
    onChangeDate(
      choice === 'none' ? null : choice === 'today' ? getTodayDateKey() : getTomorrowDateKey(),
    );
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <ChoiceChips
        options={buildDateChoiceOptions(date, allowClear)}
        selected={[pickerVisible ? 'other' : getDateChoice(date)]}
        onToggle={choose}
      />
      {pickerVisible ? (
        <DateTimePicker
          value={date ? new Date(`${date}T12:00:00`) : new Date()}
          mode="date"
          display="inline"
          themeVariant={getPalette().scheme}
          accentColor={colors.textPrimary}
          onChange={(event, selectedDate) => {
            if (event.type === 'dismissed') {
              setPickerVisible(false);
              return;
            }

            if (selectedDate) {
              onChangeDate(formatDateKey(selectedDate));
            }
          }}
        />
      ) : null}
    </View>
  );
};

const styles = themedStyles(() => ({
  field: {
    gap: 8,
  },
  label: {
    paddingHorizontal: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
}));
