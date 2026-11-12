import { useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { getPalette, themedStyles } from '../../theme/runtime';
import { getTodayDateKey } from '../../utils/date';
import { ChoiceChips } from '../ui/ChoiceChips';
import { DateChoice, buildDateChoiceOptions, getDateChoice, getTomorrowDateKey } from './dateChoices';
import type { TaskDateFieldProps } from './TaskDateField';

/** Web-Variante: Schnellauswahl plus das Datumsfeld des Browsers. */
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
        <input
          type="date"
          aria-label={label}
          value={date ?? ''}
          onChange={(event) => {
            // Ein geleertes Feld liefert "", ein gültiges Datum immer JJJJ-MM-TT.
            const value = event.target.value;
            if (value) {
              onChangeDate(value);
            } else if (allowClear) {
              onChangeDate(null);
            }
          }}
          style={{
            minHeight: 52,
            boxSizing: 'border-box',
            padding: '0 16px',
            borderRadius: 18,
            border: `1px solid ${colors.glassLine}`,
            background: colors.surfaceElevated,
            color: colors.textPrimary,
            colorScheme: getPalette().scheme,
            font: 'inherit',
            fontSize: 17,
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
