import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { DurationWheelPicker } from '../../src/components/timer/DurationWheelPicker';
import { ModeTabs } from '../../src/components/timer/ModeTabs';
import { TaskAssignmentCard } from '../../src/components/timer/TaskAssignmentCard';
import { TimerDisplayCard } from '../../src/components/timer/TimerDisplayCard';
import { IconButton } from '../../src/components/ui/IconButton';
import { RoundButton } from '../../src/components/ui/RoundButton';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { colors } from '../../src/constants/colors';
import { useTimer } from '../../src/hooks/useTimer';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';
import { formatTimeLabel } from '../../src/utils/date';

export default function TimerScreen() {
  const router = useRouter();
  const timer = useTimer();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const latestSession = useSessionsStore((state) => state.latestSession);
  const assignSession = useSessionsStore((state) => state.assignSession);
  const {
    setMode,
    setDurations,
    selectTask,
    setFreeSessionTag,
    start,
    pause,
    resume,
    reset,
    finishNow,
  } = useTimerStore(useShallow((state) => ({
    setMode: state.setMode,
    setDurations: state.setDurations,
    selectTask: state.selectTask,
    setFreeSessionTag: state.setFreeSessionTag,
    start: state.start,
    pause: state.pause,
    resume: state.resume,
    reset: state.reset,
    finishNow: state.finishNow,
  })));

  const runSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  return (
    <Screen
      title="Timer"
      subtitle="Starte und steuere deine aktuelle Session."
      headerRight={<IconButton name="settings-outline" accessibilityLabel="Einstellungen" onPress={() => router.push('/settings')} />}
    >
      <ModeTabs
        value={timer.activeMode}
        disabled={timer.status !== 'idle'}
        onChange={(mode) => void runSafely(() => setMode(mode), 'Modus konnte nicht gesetzt werden')}
      />

      <TimerDisplayCard
        mode={timer.activeMode}
        status={timer.status}
        formattedRemaining={timer.formattedRemaining}
        progress={timer.progress}
      />
<View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-evenly', paddingVertical: 8 }}>
        <RoundButton
          icon="refresh"
          label="Reset"
          onPress={() => void runSafely(reset, 'Timer konnte nicht zurückgesetzt werden')}
        />
        {timer.status === 'idle' ? (
          <RoundButton
            size="lg"
            variant="primary"
            icon="play"
            label="Start"
            onPress={() => void runSafely(start, 'Timer konnte nicht gestartet werden')}
          />
        ) : timer.status === 'running' ? (
          <RoundButton
            size="lg"
            variant="primary"
            icon="pause"
            label="Pause"
            onPress={() => void runSafely(pause, 'Timer konnte nicht pausiert werden')}
          />
        ) : (
          <RoundButton
            size="lg"
            variant="primary"
            icon="play"
            label="Weiter"
            onPress={() => void runSafely(resume, 'Timer konnte nicht fortgesetzt werden')}
          />
        )}
        {timer.status !== 'idle' ? (
          <RoundButton
            variant="danger"
            icon="stop"
            label="Beenden"
            onPress={() => void runSafely(finishNow, 'Timer konnte nicht beendet werden')}
          />
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>
      {timer.activeMode === 'longBreak' && timer.status === 'idle' ? (
        <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
          Die lange Pause ist bereit.
        </Text>
      ) : null}
      <TaskAssignmentCard
        title="Aktuelle Zuordnung"
        tasks={tasks}
        tags={tags}
        selectedTaskId={timer.selectedTaskId}
        selectedTagId={timer.selectedTagId}
        onSelectTask={(taskId) => runSafely(() => selectTask(taskId), 'Aufgabe konnte nicht zugewiesen werden')}
        onSelectFreeTag={(tagId) => runSafely(() => setFreeSessionTag(tagId), 'Tag konnte nicht gesetzt werden')}
      />

      <SectionCard>
        <SectionHeader title="Dauer" subtitle="Minuten pro Phase" />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <DurationWheelPicker
            label="Fokus"
            value={timer.focusMinutes}
            disabled={timer.status !== 'idle'}
            onChange={(value) =>
              void runSafely(() => setDurations({ focusMinutes: value }), 'Sessiondauer konnte nicht gespeichert werden')
            }
          />
          <DurationWheelPicker
            label="Kurz"
            value={timer.shortBreakMinutes}
            disabled={timer.status !== 'idle'}
            onChange={(value) =>
              void runSafely(() => setDurations({ shortBreakMinutes: value }), 'Kurzpause konnte nicht gespeichert werden')
            }
          />
          <DurationWheelPicker
            label="Lang"
            value={timer.longBreakMinutes}
            disabled={timer.status !== 'idle'}
            onChange={(value) =>
              void runSafely(() => setDurations({ longBreakMinutes: value }), 'Lange Pause konnte nicht gespeichert werden')
            }
          />
        </View>
      </SectionCard>

      

      {latestSession ? (
        <TaskAssignmentCard
          title="Letzte Session"
          subtitle={`${formatTimeLabel(latestSession.startTime)} - ${formatTimeLabel(latestSession.endTime)}`}
          tasks={tasks}
          tags={tags}
          selectedTaskId={latestSession.taskId}
          selectedTagId={latestSession.tagId}
          onSelectTask={(taskId) =>
            runSafely(
              () => assignSession(latestSession.id, { taskId, tagId: latestSession.tagId }),
              'Session konnte nicht aktualisiert werden',
            )
          }
          onSelectFreeTag={(tagId) =>
            runSafely(
              () => assignSession(latestSession.id, { taskId: null, tagId }),
              'Session konnte nicht aktualisiert werden',
            )
          }
        />
      ) : null}
    </Screen>
  );
}
