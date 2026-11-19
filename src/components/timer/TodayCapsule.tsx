import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { useTodayFocusMinutes } from '../../hooks/useTodayFocusMinutes';
import { useSettingsStore } from '../../store/settingsStore';
import { themedStyles } from '../../theme/runtime';
import { formatMinutesLong } from '../../utils/duration';
import { formatHoursClock } from '../../utils/stats';
import { Glass } from '../ui/Glass';

/** Heutige Fokuszeit; mit gesetztem Tagesziel auch der Fortschritt dorthin. */
export const TodayCapsule = () => {
  const minutes = useTodayFocusMinutes();
  const goalHours = useSettingsStore((state) => state.notificationPreferences.dailyFocusGoalHours);

  if (!goalHours) {
    return (
      <Glass radius={22} style={styles.capsule}>
        <Text style={styles.label}>Heute {formatMinutesLong(minutes)}</Text>
      </Glass>
    );
  }

  const goalMinutes = goalHours * 60;
  const progress = Math.min(1, minutes / goalMinutes);
  const reached = minutes >= goalMinutes;

  return (
    <Glass
      radius={22}
      style={styles.capsule}
      accessible
      accessibilityLabel={`Heute ${formatMinutesLong(minutes)} fokussiert. Tagesziel ${formatMinutesLong(
        goalMinutes,
      )}${reached ? ', erreicht' : `, ${Math.round(progress * 100)} Prozent`}`}
    >
      <Text style={styles.label}>Heute {formatHoursClock(minutes)}</Text>
      {reached ? (
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
      ) : (
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(4, Math.round(progress * 100))}%` }]} />
        </View>
      )}
      <Text style={styles.goal}>{formatHoursClock(goalMinutes)}</Text>
    </Glass>
  );
};

const styles = themedStyles(() => ({
  capsule: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  goal: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 40,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
}));
