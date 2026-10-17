import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { TimerMode, TimerStatus } from '../../types/timer';

const modeLabels: Record<TimerMode, string> = {
  focus: 'Fokus',
  shortBreak: 'Kurze Pause',
  longBreak: 'Lange Pause',
};

const modeColor: Record<TimerMode, string> = {
  focus: colors.accent,
  shortBreak: colors.success,
  longBreak: colors.warning,
};

interface TimerDisplayCardProps {
  mode: TimerMode;
  status: TimerStatus;
  formattedRemaining: string;
  progress: number;
}

export const TimerDisplayCard = ({
  mode,
  status,
  formattedRemaining,
  progress,
}: TimerDisplayCardProps) => {
  const color = modeColor[mode];
  return (
    <View style={styles.card}>
      <View style={[styles.modePill, { backgroundColor: `${color}26` }]}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text style={[styles.kicker, { color }]}>{modeLabels[mode]}</Text>
      </View>
      <Text style={styles.clock} numberOfLines={1} adjustsFontSizeToFit>
        {formattedRemaining}
      </Text>
      <Text style={styles.status}>
        {status === 'running' ? 'Läuft' : status === 'paused' ? 'Pausiert' : 'Bereit'}
      </Text>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { backgroundColor: color, width: `${Math.max(0, Math.min(progress, 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingVertical: spacing['3xl'] + spacing.md,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
    alignItems: 'center',
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  clock: {
    color: colors.textPrimary,
    fontSize: 88,
    lineHeight: 96,
    fontWeight: '200',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  status: { color: colors.textMuted, fontSize: 14, fontWeight: '500' },
  progressTrack: {
    width: '60%',
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: radii.pill },
});
