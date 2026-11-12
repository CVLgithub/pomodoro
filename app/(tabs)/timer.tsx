import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { FOCUS_CYCLE_LENGTH } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { TIMER_MODES } from '../../src/constants/timerModes';
import { useOpenSheet } from '../../src/hooks/useSheet';
import { useTimer } from '../../src/hooks/useTimer';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';
import { themedStyles } from '../../src/theme/runtime';
import { addSeconds, formatTimeLabel } from '../../src/utils/date';

const EXTEND_MINUTES = 5;

export default function TimerScreen() {
  const timer = useTimer();
  const openSheet = useOpenSheet();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const { start, pause, resume, finishNow, extend } = useTimerStore(
    useShallow((state) => ({
      start: state.start,
      pause: state.pause,
      resume: state.resume,
      finishNow: state.finishNow,
      extend: state.extend,
    })),
  );

  const runSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const isIdle = timer.status === 'idle';
  const activeMode =
    TIMER_MODES.find((entry) => entry.mode === timer.activeMode) ?? TIMER_MODES[0];
  const round = Math.min(timer.completedFocusCountInCycle + 1, FOCUS_CYCLE_LENGTH);
  const totalMinutes = Math.round(timer.totalSeconds / 60);
  const detail =
    timer.status === 'running'
      ? `endet um ${formatTimeLabel(addSeconds(timer.now, timer.remainingSeconds))} · ${totalMinutes} Min.`
      : timer.status === 'paused'
        ? `Pausiert · ${totalMinutes} Min.`
        : `${totalMinutes} Min.`;

  return (
    <SessionStage
      header={
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Modus ${activeMode.label}. Modus und Dauer ändern`}
            onPress={() => openSheet(routes.timerModeSheet)}
          >
            <Glass radius={22} interactive style={styles.capsule}>
              <Text style={styles.capsuleTitle}>{activeMode.label}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textPrimary} />
            </Glass>
          </Pressable>
          <Glass
            radius={22}
            style={styles.capsule}
            accessible
            accessibilityLabel={`Runde ${round} von ${FOCUS_CYCLE_LENGTH}`}
          >
            <View style={styles.dots}>
              {Array.from({ length: FOCUS_CYCLE_LENGTH }, (_, index) => (
                <View
                  key={index}
                  style={[styles.dot, index < round ? styles.dotFilled : null]}
                />
              ))}
            </View>
            <Text style={styles.capsuleLabel}>
              {round} von {FOCUS_CYCLE_LENGTH}
            </Text>
          </Glass>
        </>
      }
      time={timer.formattedRemaining}
      timeLabel={`Restzeit ${timer.formattedRemaining}`}
      below={
        <>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(timer.progress * 100) }}
          >
            <View style={[styles.trackFill, { width: `${Math.round(timer.progress * 100)}%` }]} />
          </View>
          <Text style={styles.detail}>{detail}</Text>
        </>
      }
    >
      <AssignmentRow
        tasks={tasks}
        tags={tags}
        selectedTaskId={timer.selectedTaskId}
        selectedTagId={timer.selectedTagId}
        target="timer"
      />
      <ControlRow>
        {isIdle ? null : (
          <RoundControl
            label="Session beenden"
            icon="stop"
            onPress={() => void runSafely(finishNow, 'Timer konnte nicht beendet werden')}
          />
        )}
        {isIdle ? (
          <PrimaryControl
            label="Start"
            icon="play"
            onPress={() => void runSafely(start, 'Timer konnte nicht gestartet werden')}
          />
        ) : timer.status === 'running' ? (
          <PrimaryControl
            label="Pause"
            icon="pause"
            onPress={() => void runSafely(pause, 'Timer konnte nicht pausiert werden')}
          />
        ) : (
          <PrimaryControl
            label="Weiter"
            icon="play"
            onPress={() => void runSafely(resume, 'Timer konnte nicht fortgesetzt werden')}
          />
        )}
        {isIdle ? null : (
          <RoundControl
            label={`${EXTEND_MINUTES} Minuten verlängern`}
            text={`+${EXTEND_MINUTES}`}
            onPress={() =>
              void runSafely(() => extend(EXTEND_MINUTES), 'Timer konnte nicht verlängert werden')
            }
          />
        )}
      </ControlRow>
    </SessionStage>
  );
}

const styles = themedStyles(() => ({
  capsule: {
    height: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capsuleTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  capsuleLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.track,
  },
  dotFilled: {
    backgroundColor: colors.textPrimary,
  },
  track: {
    width: 250,
    maxWidth: '80%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: colors.track,
  },
  trackFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.textPrimary,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 17,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
}));
