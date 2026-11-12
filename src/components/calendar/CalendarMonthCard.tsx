import { StyleSheet } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

import { colors } from '../../constants/colors';
import { getActiveThemeName } from '../../theme/runtime';
import { Glass } from '../ui/Glass';

interface CalendarMonthCardProps {
  selectedDate: string;
  visibleMonthDate: string;
  markedDates: Record<string, { marked?: boolean; dotColor?: string; selected?: boolean }>;
  onSelectDate: (dateKey: string) => void;
  onChangeVisibleMonth: (dateKey: string) => void;
}

export const CalendarMonthCard = ({
  selectedDate,
  visibleMonthDate,
  markedDates,
  onSelectDate,
  onChangeVisibleMonth,
}: CalendarMonthCardProps) => (
  <Glass radius={30} style={styles.container}>
    <Calendar
      // Der Kalender übernimmt sein Farbschema nur beim Einhängen.
      key={getActiveThemeName()}
      current={visibleMonthDate}
      firstDay={1}
      markedDates={{
        ...markedDates,
        [selectedDate]: {
          ...(markedDates[selectedDate] ?? {}),
          selected: true,
        },
      }}
      onDayPress={(day: DateData) => onSelectDate(day.dateString)}
      onMonthChange={(month: DateData) => onChangeVisibleMonth(month.dateString)}
      theme={{
        backgroundColor: 'transparent',
        calendarBackground: 'transparent',
        textSectionTitleColor: colors.textSecondary,
        selectedDayBackgroundColor: colors.accent,
        selectedDayTextColor: colors.onAccent,
        selectedDotColor: colors.onAccent,
        todayTextColor: colors.textPrimary,
        dayTextColor: colors.textPrimary,
        monthTextColor: colors.textPrimary,
        arrowColor: colors.textPrimary,
        textDisabledColor: colors.textMuted,
        textDayFontSize: 17,
        textMonthFontSize: 17,
        textMonthFontWeight: '700',
        textDayHeaderFontSize: 12,
        textDayHeaderFontWeight: '600',
      }}
      style={styles.calendar}
      enableSwipeMonths
    />
  </Glass>
);

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  calendar: {
    backgroundColor: 'transparent',
  },
});
