import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { TaskComposer } from '../../src/components/tasks/TaskComposer';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { useTodayData } from '../../src/hooks/useTodayData';
import { useTimer } from '../../src/hooks/useTimer';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';
import { getTodayDateKey } from '../../src/utils/date';
import { formatMinutesShort } from '../../src/utils/duration';

export default function TodayScreen() {
  const router = useRouter();
  const { todaysTasks, focusMinutesToday } = useTodayData();
  const timer = useTimer();
  const tags = useTagsStore((state) => state.tags);
  const createTask = useTasksStore((state) => state.createTask);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const startTimer = useTimerStore((state) => state.start);
  const setMode = useTimerStore((state) => state.setMode);
  const setFreeSessionTag = useTimerStore((state) => state.setFreeSessionTag);

  const tagsById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));

  const handleQuickAdd = async (title: string) => {
    try {
      await createTask({
        title,
        date: getTodayDateKey(),
        tagId: GENERAL_TAG_ID,
      });
    } catch (error) {
      Alert.alert('Aufgabe konnte nicht erstellt werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const handleStartFreeSession = async () => {
    try {
      await setMode('focus');
      await setFreeSessionTag(GENERAL_TAG_ID);

      if (timer.status === 'idle') {
        await startTimer();
      }

      router.push('/(tabs)/timer');
    } catch (error) {
      Alert.alert('Timer konnte nicht gestartet werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  return (
    <Screen
      title="Heute"
      subtitle="Schneller Überblick für den aktuellen Tag."
      headerRight={<Button label="Einstellungen" variant="ghost" onPress={() => router.push('/settings')} />}
    >
      <SectionCard>
        <SectionHeader title="Aktiver Timer" subtitle={timer.status === 'idle' ? 'Noch nicht gestartet' : 'Läuft weiter'} />
        <Text style={{ color: '#F5F7FA', fontSize: 42, fontWeight: '700' }}>{timer.formattedRemaining}</Text>
        <Text style={{ color: '#97A3B6' }}>
          Heute erfasst: {formatMinutesShort(focusMinutesToday)}
        </Text>
        <View style={{ gap: 12 }}>
          <Button label="Timer ohne Aufgabe starten" onPress={handleStartFreeSession} />
          <Button label="Zum Timer" variant="secondary" onPress={() => router.push('/(tabs)/timer')} />
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Neue Aufgabe" subtitle="Sofort für heute einplanen" />
        <TaskComposer placeholder="Heute erledigen…" onSubmit={handleQuickAdd} />
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Heutige Aufgaben" subtitle={`${todaysTasks.length} geplant`} />
        {todaysTasks.length === 0 ? (
          <EmptyState
            title="Keine Aufgaben für heute"
            description="Lege eine Aufgabe an oder starte direkt eine freie Session."
          />
        ) : (
          todaysTasks.map((task) => (
            <TaskRow
              key={task.key}
              task={task.task}
              tag={tagsById[task.task.tagId]}
              onPress={() => router.push(`/task/${task.task.id}`)}
              onToggle={(value) =>
                void toggleTaskCompletion(task.task.id, value, { date: task.occurrenceDate })
              }
              isCompleted={task.isCompleted}
              completedAt={task.completedAt}
              displayDate={null}
            />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}
