import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { TaskGroupSection } from '../../src/components/tasks/TaskGroupSection';
import { colors } from '../../src/constants/colors';
import { radii, spacing } from '../../src/constants/spacing';
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
          title={`${tag.name} - Offen`}
          tasks={groupedTasks}
          tagsById={tagsById}
          onToggleTask={(task, nextValue) => void toggleTaskCompletion(task.id, nextValue)}
          onPressTask={(task) => router.push(`/task/${task.id}`)}
        />
      ))}

      {completedGroups.length > 0 ? (
        <View style={styles.completedSection}>
          <View style={styles.completedSectionHeader}>
            <Text style={styles.completedEyebrow}>Erledigte Aufgaben</Text>
            <Text style={styles.completedTitle}>Abgeschlossen</Text>
            <Text style={styles.completedDescription}>
              Diese Aufgaben sind bewusst separat vom aktiven Aufgabenbereich abgelegt.
            </Text>
          </View>

          <View style={styles.completedSectionList}>
            {completedGroups.map(({ tag, tasks: groupedTasks }) => (
              <TaskGroupSection
                key={`${tag.id}-completed`}
                title={`${tag.name} - Erledigt`}
                tasks={groupedTasks}
                tagsById={tagsById}
                onToggleTask={(task, nextValue) => void toggleTaskCompletion(task.id, nextValue)}
                onPressTask={(task) => router.push(`/task/${task.id}`)}
                variant="completed"
              />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  completedSection: {
    marginTop: spacing['2xl'],
    padding: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(151, 163, 182, 0.35)',
    backgroundColor: 'rgba(21, 27, 35, 0.92)',
    gap: spacing.lg,
  },
  completedSectionHeader: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(151, 163, 182, 0.2)',
  },
  completedEyebrow: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  completedTitle: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  completedDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
  },
  completedSectionList: {
    gap: spacing.md,
  },
});
