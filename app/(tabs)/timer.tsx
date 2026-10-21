import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { DurationWheelPicker } from '../../src/components/timer/DurationWheelPicker';
import { TaskAssignmentCard } from '../../src/components/timer/TaskAssignmentCard';
import { TimerDisplayCard } from '../../src/components/timer/TimerDisplayCard';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { useTimer } from '../../src/hooks/useTimer';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';

export default function TimerScreen() {
  const router = useRouter();
  const timer = useTimer();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const {
    setMode,
    setDurations,
    selectTask,
    setFreeSessionTag,
    start,
    pause,
    resume,
    finishNow,
  } = useTimerStore(useShallow((state) => ({
    setMode: state.setMode,
    setDurations: state.setDurations,
    selectTask: state.selectTask,
    setFreeSessionTag: state.setFreeSessionTag,
    start: state.start,
    pause: state.pause,
    resume: state.resume,
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
      subtitle="Starte deine Session."
      headerRight={<Button label="Einstellungen" variant="ghost" onPress={() => router.push('/settings')} />}
    >
      <TimerDisplayCard
        mode={timer.activeMode}
        formattedRemaining={timer.formattedRemaining}
        progress={timer.progress}
        modeChangeDisabled={timer.status !== 'idle'}
        onModeChange={() => {
          const nextMode =
            timer.activeMode === 'focus'
              ? 'shortBreak'
              : timer.activeMode === 'shortBreak'
                ? 'longBreak'
                : 'focus';
          void runSafely(() => setMode(nextMode), 'Modus konnte nicht gesetzt werden');
        }}
      >
        {timer.status === 'idle' ? (
          <Button label="Start" onPress={() => void runSafely(start, 'Timer konnte nicht gestartet werden')} />
        ) : null}
        {timer.status === 'running' ? (
          <Button
            label="Pause"
            variant="secondary"
            onPress={() => void runSafely(pause, 'Timer konnte nicht pausiert werden')}
          />
        ) : null}
        {timer.status === 'paused' ? (
          <Button label="Weiter" onPress={() => void runSafely(resume, 'Timer konnte nicht fortgesetzt werden')} />
        ) : null}
        {timer.status !== 'idle' ? (
          <Button
            label="Jetzt beenden"
            variant="danger"
            onPress={() => void runSafely(finishNow, 'Timer konnte nicht beendet werden')}
          />
        ) : null}
      </TimerDisplayCard>
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
        <SectionHeader title="Dauer" subtitle="Passe die Timer-Dauer an." />
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
    </Screen>
  );
}
