import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Session } from '../../types/session';
import { formatTimeLabel } from '../../utils/date';
import { formatMinutesShort } from '../../utils/duration';

interface SessionDayGroupProps {
  date: string;
  sessions: Session[];
}

export const SessionDayGroup = ({ date, sessions }: SessionDayGroupProps) => {
  const totalMinutes = sessions.reduce((total, session) => total + session.durationMinutes, 0);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.date}>{date}</Text>
        <Text style={styles.total}>{formatMinutesShort(totalMinutes)}</Text>
      </View>
      <View style={styles.list}>
        {sessions.map((session) => (
          <View key={session.id} style={styles.row}>
            <View style={styles.textBlock}>
              <Text style={styles.title}>{session.title}</Text>
              <Text style={styles.meta}>
                {formatTimeLabel(session.startTime)} - {formatTimeLabel(session.endTime)}
              </Text>
            </View>
            <Text style={styles.duration}>{formatMinutesShort(session.durationMinutes)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  total: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  duration: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});

