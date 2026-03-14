import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { CalendarMonthCard } from '../../src/components/calendar/CalendarMonthCard';
import { TaskComposer } from '../../src/components/tasks/TaskComposer';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useUiStore } from '../../src/store/uiStore';

export default function CalendarScreen() {
  const router = useRouter();
  const tasks = useTasksStore((state) => state.tasks);
  const createTask = useTasksStore((state) => state.createTask);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const tags = useTagsStore((state) => state.tags);
  const selectedDate = useUiStore((state) => state.selectedCalendarDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedCalendarDate);

  const tasksForDay = tasks.filter((task) => task.date === selectedDate);
  const tagsById = Object.fromEntries(tags.map((tag) => [tag.id, tag]));
  const markedDates = tasks.reduce<Record<string, { marked?: boolean; dotColor?: string }>>(
    (accumulator, task) => {
      if (!task.date) {
        return accumulator;
      }

      accumulator[task.date] = {
        marked: true,
        dotColor: tagsById[task.tagId]?.color ?? '#5EA2FF',
      };
      return accumulator;
    },
    {},
  );

  const handleCreate = async (title: string) => {
    try {
      await createTask({ title, date: selectedDate, tagId: GENERAL_TAG_ID });
    } catch (error) {
      Alert.alert('Aufgabe konnte nicht erstellt werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  return (
    <Screen
      title="Kalender"
      subtitle="Monatsansicht für geplante Aufgaben."
      headerRight={<Button label="Settings" variant="ghost" onPress={() => router.push('/settings')} />}
    >
      <CalendarMonthCard
        selectedDate={selectedDate}
        markedDates={markedDates}
        onSelectDate={setSelectedDate}
      />

      <SectionCard>
        <SectionHeader title={selectedDate} subtitle="Neue Aufgabe direkt für diesen Tag" />
        <TaskComposer placeholder="Für diesen Tag planen…" onSubmit={handleCreate} />
      </SectionCard>

      <SectionCard>
        <SectionHeader title="Geplante Aufgaben" subtitle={`${tasksForDay.length} Einträge`} />
        {tasksForDay.length === 0 ? (
          <EmptyState
            title="Keine Planung an diesem Tag"
            description="Aufgaben ohne Datum erscheinen nicht im Kalender."
          />
        ) : (
          tasksForDay.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              tag={tagsById[task.tagId]}
              onPress={() => router.push(`/task/${task.id}`)}
              onToggle={(value) => void toggleTaskCompletion(task.id, value)}
            />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

