import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { TimerMode } from '../../types/timer';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeader } from '../ui/SectionHeader';

const modeLabels: Record<TimerMode, string> = {
  focus: 'Fokus',
  shortBreak: 'Kurze Pause',
  longBreak: 'Lange Pause',
};

interface TimerDisplayCardProps {
  mode: TimerMode;
  formattedRemaining: string;
  progress: number;
  onModeChange: () => void;
  modeChangeDisabled?: boolean;
  children?: ReactNode;
}

export const TimerDisplayCard = ({
  mode,
  formattedRemaining,
  progress,
  onModeChange,
  modeChangeDisabled = false,
  children,
}: TimerDisplayCardProps) => {
  return (
    <SectionCard>
      <SectionHeader
        title="Timer"
        action={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Timer-Modus wechseln"
            accessibilityState={{ disabled: modeChangeDisabled }}
            disabled={modeChangeDisabled}
            onPress={onModeChange}
            style={({ pressed }) => [
              styles.statusPill,
              mode === 'focus' ? styles.focusPill : styles.breakPill,
              pressed && !modeChangeDisabled ? styles.pressed : null,
              modeChangeDisabled ? styles.disabled : null,
            ]}
          >
            <Text
              style={[
                styles.statusPillLabel,
                mode !== 'focus' ? styles.breakPillLabel : null,
              ]}
            >
              {modeLabels[mode]}
            </Text>
          </Pressable>
        }
      />
      <View style={styles.clockBlock}>
        <Text style={styles.clockLabel}>{mode === 'focus' ? 'Aktive Zeit' : 'Pausenzeit'}</Text>
        <Text style={styles.clock}>{formattedRemaining}</Text>
        <View style={styles.progressBlock}>
          <Text style={styles.progressLabel}>Verbleibend</Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.max(0, Math.min(1 - progress, 1)) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>
      {children ? <View style={styles.controls}>{children}</View> : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  clockBlock: {
    alignItems: 'center',
    gap: 8,
    minHeight: 132,
    paddingVertical: 8,
  },
  statusPill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  focusPill: {
    backgroundColor: colors.surfaceElevated,
  },
  breakPill: {
    backgroundColor: 'rgba(255, 182, 85, 0.16)',
  },
  statusPillLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  breakPillLabel: {
    color: colors.warning,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
  clockLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  clock: {
    color: colors.textPrimary,
    fontSize: 56,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.pill,
    overflow: 'hidden',
  },
  progressBlock: {
    width: '100%',
    gap: 4,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
  },
  controls: {
    gap: 12,
  },
});
