import { StyleSheet, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';

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
  <View style={styles.container}>
    <Calendar
      current={visibleMonthDate}
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
        backgroundColor: colors.surface,
        calendarBackground: colors.surface,
        textSectionTitleColor: colors.textMuted,
        selectedDayBackgroundColor: colors.accent,
        selectedDayTextColor: colors.background,
        todayTextColor: colors.accent,
        dayTextColor: colors.textPrimary,
        monthTextColor: colors.textPrimary,
        arrowColor: colors.accent,
        textDisabledColor: '#3A312D',
      }}
      style={styles.calendar}
      enableSwipeMonths
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
  },
  calendar: {
    borderRadius: radii.lg,
  },
});
