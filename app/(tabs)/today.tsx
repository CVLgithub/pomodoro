import { Alert, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AssignmentRow } from '../../src/components/timer/AssignmentRow';
import {
  ControlRow,
  PrimaryControl,
  RoundControl,
} from '../../src/components/timer/SessionControls';
import { SessionStage } from '../../src/components/timer/SessionStage';
import { Glass } from '../../src/components/ui/Glass';
import { colors } from '../../src/constants/colors';
import { useStopwatch } from '../../src/hooks/useStopwatch';
import { useTodayFocusMinutes } from '../../src/hooks/useTodayFocusMinutes';
import { useStopwatchStore } from '../../src/store/stopwatchStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { themedStyles } from '../../src/theme/runtime';
import { formatElapsedClock, formatMinutesLong } from '../../src/utils/duration';

export default function StopwatchScreen() {
  const focusMinutesToday = useTodayFocusMinutes();
  const stopwatch = useStopwatch();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const { start, switchPhase, stop } = useStopwatchStore(
    useShallow((state) => ({
      start: state.start,
      switchPhase: state.switchPhase,
      stop: state.stop,
    })),
  );

  const runSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const isRunning = stopwatch.status === 'running';
  const isActivePhase = stopwatch.phase === 'active';
  const shownSeconds = isRunning && !isActivePhase ? stopwatch.breakSeconds : stopwatch.activeSeconds;
  const statusLabel = !isRunning ? 'Bereit' : isActivePhase ? 'Aktiv' : 'Pause';
  const statusColor = !isRunning ? colors.textMuted : isActivePhase ? colors.success : colors.warning;

  return (
    <SessionStage
      header={
        <>
          <Text style={styles.title} accessibilityRole="header">
            Stoppuhr
          </Text>
          <Glass radius={22} style={styles.capsule}>
            <Text style={styles.capsuleLabel}>Heute {formatMinutesLong(focusMinutesToday)}</Text>
          </Glass>
        </>
      }
      eyebrow={
        <View style={styles.status}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
      }
      time={formatElapsedClock(shownSeconds)}
      timeLabel={`${isActivePhase ? 'Aktive Zeit' : 'Pausenzeit'} ${formatElapsedClock(shownSeconds)}`}
      below={
        isRunning ? (
          <Text style={styles.secondary}>
            {isActivePhase
              ? `Pause bisher ${formatElapsedClock(stopwatch.breakSeconds)}`
              : `Aktive Zeit ${formatElapsedClock(stopwatch.activeSeconds)}`}
          </Text>
        ) : null
      }
    >
      <AssignmentRow
        tasks={tasks}
        tags={tags}
        selectedTaskId={stopwatch.selectedTaskId}
        selectedTagId={stopwatch.selectedTagId}
        target="stopwatch"
      />
      <ControlRow>
        {isRunning ? (
          <RoundControl
            label="Session beenden"
            icon="stop"
            onPress={() => void runSafely(stop, 'Session konnte nicht beendet werden')}
          />
        ) : null}
        <PrimaryControl
          label={!isRunning ? 'Start' : isActivePhase ? 'Pause' : 'Weiter'}
          icon={!isRunning || !isActivePhase ? 'play' : 'pause'}
          onPress={() =>
            void (isRunning
              ? runSafely(switchPhase, 'Stoppuhr konnte nicht fortgesetzt werden')
              : runSafely(start, 'Stoppuhr konnte nicht gestartet werden'))
          }
        />
      </ControlRow>
    </SessionStage>
  );
}

const styles = themedStyles(() => ({
  title: {
    flex: 1,
    paddingHorizontal: 4,
    color: colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  capsule: {
    height: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  capsuleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondary: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
}));
