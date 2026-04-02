import { useMemo } from 'react';
import { useRouter } from 'expo-router';

import { TaskGroupSection } from '../../src/components/tasks/TaskGroupSection';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';

export default function TasksScreen() {
  const router = useRouter();
  const tasks = useTasksStore((state) => state.tasks);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const tags = useTagsStore((state) => state.tags);

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  const openGroups = tags
    .map((tag) => ({
      tag,
      tasks: tasks.filter((task) => task.tagId === tag.id && !task.isCompleted),
    }))
    .filter((group) => group.tasks.length > 0);

  const completedGroups = tags
    .map((tag) => ({
      tag,
      tasks: tasks.filter((task) => task.tagId === tag.id && task.isCompleted),
    }))
    .filter((group) => group.tasks.length > 0);

  return (
    <Screen
      title="Aufgaben"
      subtitle="Noch offene und bereits erledigte Aufgaben."
      headerRight={<Button label="Neu" variant="ghost" onPress={() => router.push('/task/new')} />}
    >
      {tasks.length === 0 ? (
        <EmptyState
          title="Noch keine Aufgaben"
          description="Erstelle die erste Aufgabe oder plane sie direkt im Heute- oder Kalender-Tab."
        />
      ) : null}

      {openGroups.map(({ tag, tasks: groupedTasks }) => (
        <TaskGroupSection
          key={`${tag.id}-open`}
          title={`${tag.name} · Offen`}
          tasks={groupedTasks}
          tagsById={tagsById}
          onToggleTask={(task, nextValue) => void toggleTaskCompletion(task.id, nextValue)}
          onPressTask={(task) => router.push(`/task/${task.id}`)}
        />
      ))}

      {completedGroups.map(({ tag, tasks: groupedTasks }) => (
        <TaskGroupSection
          key={`${tag.id}-completed`}
          title={`${tag.name} · Erledigt`}
          tasks={groupedTasks}
          tagsById={tagsById}
          onToggleTask={(task, nextValue) => void toggleTaskCompletion(task.id, nextValue)}
          onPressTask={(task) => router.push(`/task/${task.id}`)}
        />
      ))}
    </Screen>
  );
}

