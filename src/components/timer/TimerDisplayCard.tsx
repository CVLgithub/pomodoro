import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { TimerMode, TimerStatus } from '../../types/timer';

const modeLabels: Record<TimerMode, string> = {
  focus: 'Fokus',
  shortBreak: 'Kurze Pause',
  longBreak: 'Lange Pause',
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
}: TimerDisplayCardProps) => (
  <View style={styles.card}>
    <Text style={styles.kicker}>{modeLabels[mode]}</Text>
    <Text style={styles.clock}>{formattedRemaining}</Text>
    <Text style={styles.status}>
      {status === 'running' ? 'Läuft' : status === 'paused' ? 'Pausiert' : 'Bereit'}
    </Text>
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.max(0, Math.min(progress, 1)) * 100}%` },
        ]}
      />
    </View>
  </View>
);

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  kicker: {
    color: colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  clock: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '700',
  },
  status: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  progressTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
});

