import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { TaskAssignmentCard } from '../../src/components/timer/TaskAssignmentCard';
import { IconButton } from '../../src/components/ui/IconButton';
import { RoundButton } from '../../src/components/ui/RoundButton';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { colors } from '../../src/constants/colors';
import { useTodayData } from '../../src/hooks/useTodayData';
import { useStopwatch } from '../../src/hooks/useStopwatch';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useStopwatchStore } from '../../src/store/stopwatchStore';
import { formatMinutesShort } from '../../src/utils/duration';

export default function TodayScreen() {
  const router = useRouter();
  const { focusMinutesToday } = useTodayData();
  const stopwatch = useStopwatch();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const { start, switchPhase, stop, selectTask, setFreeSessionTag } = useStopwatchStore(
    useShallow((state) => ({
      start: state.start,
      switchPhase: state.switchPhase,
      stop: state.stop,
      selectTask: state.selectTask,
      setFreeSessionTag: state.setFreeSessionTag,
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

  return (
    <Screen
      title="Heute"
      subtitle="Stoppuhr für deine heutige Arbeit."
      headerRight={<IconButton name="settings-outline" accessibilityLabel="Einstellungen" onPress={() => router.push('/settings')} />}
    >
      <SectionCard>
        <SectionHeader
          title="Stoppuhr"
          action={(
            <View
              style={[
                styles.statusPill,
                !isRunning
                  ? styles.readyPill
                  : isActivePhase
                    ? styles.activePill
                    : styles.breakPill,
              ]}
            >
              <Text
                style={[
                  styles.statusPillLabel,
                  !isRunning
                    ? styles.readyPillLabel
                    : isActivePhase
                      ? styles.activePillLabel
                      : styles.breakPillLabel,
                ]}
              >
                {!isRunning ? 'Bereit' : isActivePhase ? 'Aktiv' : 'Pause'}
              </Text>
            </View>
          )}
        />
        <View style={styles.clockBlock}>
          <Text style={styles.clockLabel}>{isActivePhase ? 'Aktive Zeit' : 'Pausenzeit'}</Text>
          <Text style={styles.clock}>
            {isActivePhase ? stopwatch.formattedActive : stopwatch.formattedBreak}
          </Text>
          {isRunning ? (
            <Text style={styles.secondaryClock}>
              {isActivePhase ? 'Pause' : 'Aktive Zeit'} ·{' '}
              {isActivePhase ? stopwatch.formattedBreak : stopwatch.formattedActive}
            </Text>
          ) : null}
          <Text style={styles.todayTotal}>Heute erfasst: {formatMinutesShort(focusMinutesToday)}</Text>
        </View>
        <View style={styles.controls}>
          {!isRunning ? (
            <RoundButton
              size="lg"
              variant="primary"
              icon="play"
              label="Start"
              onPress={() => void runSafely(start, 'Stoppuhr konnte nicht gestartet werden')}
            />
          ) : (
            <>
              <RoundButton
                size="lg"
                variant="primary"
                icon={isActivePhase ? 'pause' : 'play'}
                label={isActivePhase ? 'Pause' : 'Weiter'}
                onPress={() =>
                  void runSafely(switchPhase, 'Stoppuhr konnte nicht fortgesetzt werden')
                }
              />
              <RoundButton
                variant="danger"
                icon="stop"
                label="Session beenden"
                onPress={() => void runSafely(stop, 'Session konnte nicht beendet werden')}
              />
            </>
          )}
        </View>
      </SectionCard>

      <TaskAssignmentCard
        title="Aktuelle Zuordnung"
        tasks={tasks}
        tags={tags}
        selectedTaskId={stopwatch.selectedTaskId}
        selectedTagId={stopwatch.selectedTagId}
        onSelectTask={(taskId) =>
          runSafely(() => selectTask(taskId), 'Aufgabe konnte nicht zugewiesen werden')
        }
        onSelectFreeTag={(tagId) =>
          runSafely(() => setFreeSessionTag(tagId), 'Tag konnte nicht gesetzt werden')
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  clockBlock: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  statusPill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: 999,
  },
  readyPill: {
    backgroundColor: colors.surfaceElevated,
  },
  activePill: {
    backgroundColor: 'rgba(95, 211, 141, 0.16)',
  },
  breakPill: {
    backgroundColor: 'rgba(255, 194, 102, 0.16)',
  },
  statusPillLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  readyPillLabel: {
    color: colors.textSecondary,
  },
  activePillLabel: {
    color: colors.success,
  },
  breakPillLabel: {
    color: colors.warning,
  },
  clockLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  clock: {
    color: colors.textPrimary,
    fontSize: 80,
    lineHeight: 88,
    fontWeight: '200',
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  secondaryClock: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  todayTotal: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 40,
    paddingTop: 4,
  },
});
