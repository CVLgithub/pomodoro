import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { TaskGroupSection } from '../../src/components/tasks/TaskGroupSection';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { colors } from '../../src/constants/colors';
import { radii, spacing } from '../../src/constants/spacing';
import { useTagsStore } from '../../src/store/tagsStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useUiStore } from '../../src/store/uiStore';
import { Tag } from '../../src/types/tag';
import { Task } from '../../src/types/task';
import {
  getTagGroupKey,
  getTagGroupLabel,
  sortTagsByGroupAndName,
} from '../../src/utils/tagGroups';
import { isTaskRecurring } from '../../src/utils/taskRecurrence';

type TasksByTag = {
  tag: Tag;
  tasks: Task[];
};

type TasksByTagGroup = {
  groupKey: string;
  groupLabel: string;
  entries: TasksByTag[];
  taskCount: number;
};

const CompletedTasksToggle = ({
  expanded,
  onPress,
}: {
  expanded: boolean;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ expanded }}
    onPress={onPress}
    style={styles.completedToggle}
  >
    <Text style={styles.completedToggleLabel}>
      {expanded ? 'Erledigte Aufgaben ausblenden' : 'Erledigte Aufgaben'}
    </Text>
    <Text style={styles.completedToggleHint}>{expanded ? '⌃' : '⌄'}</Text>
  </Pressable>
);

const buildTasksByTagGroups = (
  tags: Tag[],
  tasks: Task[],
  tagGroups: Parameters<typeof getTagGroupLabel>[1],
): TasksByTagGroup[] => {
  const sortedTags = sortTagsByGroupAndName(tags);
  const tasksByTagId = new Map<string, Task[]>();

  for (const task of tasks) {
    const entries = tasksByTagId.get(task.tagId) ?? [];
    entries.push(task);
    tasksByTagId.set(task.tagId, entries);
  }

  const groups: TasksByTagGroup[] = [];

  for (const tag of sortedTags) {
    const groupedTasks = tasksByTagId.get(tag.id) ?? [];
    if (groupedTasks.length === 0) {
      continue;
    }

    const groupKey = getTagGroupKey(tag.groupId);
    const groupLabel = getTagGroupLabel(tag.groupId, tagGroups);
    const existingGroup = groups.find((entry) => entry.groupKey === groupKey);

    if (existingGroup) {
      existingGroup.entries.push({ tag, tasks: groupedTasks });
      existingGroup.taskCount += groupedTasks.length;
      continue;
    }

    groups.push({
      groupKey,
      groupLabel,
      entries: [{ tag, tasks: groupedTasks }],
      taskCount: groupedTasks.length,
    });
  }

  return groups;
};

export default function TasksScreen() {
  const router = useRouter();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const tasks = useTasksStore((state) => state.tasks);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const tags = useTagsStore((state) => state.tags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const collapsedTaskTagGroups = useUiStore((state) => state.collapsedTaskTagGroups);
  const toggleTaskTagGroupCollapsed = useUiStore(
    (state) => state.toggleTaskTagGroupCollapsed,
  );

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])),
    [tags],
  );

  const openTagGroups = useMemo(
    () =>
      buildTasksByTagGroups(
        tags,
        tasks.filter((task) => !task.isCompleted),
        tagGroups,
      ),
    [tags, tasks, tagGroups],
  );

  const completedTagGroups = useMemo(
    () =>
      buildTasksByTagGroups(
        tags,
        tasks.filter((task) => task.isCompleted && !isTaskRecurring(task)),
        tagGroups,
      ),
    [tags, tasks, tagGroups],
  );

  const renderTagGroups = (
    groups: TasksByTagGroup[],
    options?: {
      variant?: 'default' | 'completed';
      collapseScope?: 'open' | 'completed';
    },
  ) => {
    const variant = options?.variant ?? 'default';
    const collapseScope = options?.collapseScope ?? 'open';

    return groups.map((group) => {
      const collapseKey = `${collapseScope}:${group.groupKey}`;
      const isCollapsed = collapsedTaskTagGroups[collapseKey] ?? false;

      return (
        <View
          key={`${collapseScope}:${group.groupKey}`}
          style={[
            styles.tagGroupBlock,
            variant === 'completed' ? styles.tagGroupBlockCompleted : null,
          ]}
        >
          <Pressable
            style={[
              styles.tagGroupToggle,
              variant === 'completed' ? styles.tagGroupToggleCompleted : null,
            ]}
            onPress={() => toggleTaskTagGroupCollapsed(collapseKey)}
          >
            <View style={styles.tagGroupToggleCopy}>
              <View style={styles.tagGroupTitleRow}>
                <Text style={styles.tagGroupTitle}>{group.groupLabel}</Text>
                <Text style={styles.tagGroupMeta}>
                  {group.entries.length} {group.entries.length === 1 ? 'Tag' : 'Tags'} -{' '}
                  {group.taskCount} Einträge
                </Text>
              </View>
              <View style={styles.tagGroupTagPreview}>
                {group.entries.map(({ tag }) => (
                  <View
                    key={`${collapseScope}:${group.groupKey}:preview:${tag.id}`}
                    style={styles.tagGroupTagChip}
                  >
                    <View style={[styles.tagGroupTagDot, { backgroundColor: tag.color }]} />
                    <Text style={styles.tagGroupTagLabel}>{tag.name}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text
              style={[
                styles.tagGroupAction,
                variant === 'completed' ? styles.tagGroupActionCompleted : null,
              ]}
            >
              {isCollapsed ? 'Zeigen' : 'Verbergen'}
            </Text>
          </Pressable>

          {!isCollapsed ? (
            <View style={styles.tagGroupSections}>
              {group.entries.map(({ tag, tasks: groupedTasks }) => (
                <TaskGroupSection
                  key={`${collapseScope}:${group.groupKey}:${tag.id}`}
                  title={tag.name}
                  subtitle={`${groupedTasks.length} ${
                    variant === 'completed' ? 'erledigt' : 'offen'
                  }`}
                  tasks={groupedTasks}
                  tagsById={tagsById}
                  accentColor={tag.color}
                  onToggleTask={(task, nextValue) =>
                    void toggleTaskCompletion(task.id, nextValue)
                  }
                  onPressTask={(task) => router.push(`/task/${task.id}`)}
                  variant={variant}
                  getTaskRowProps={(task) => ({
                    displayDate:
                      isTaskRecurring(task) && task.date ? `Start ${task.date}` : undefined,
                    disableToggle: isTaskRecurring(task),
                  })}
                />
              ))}
            </View>
          ) : null}
        </View>
      );
    });
  };

  return (
    <Screen
      title="Aufgaben"
      subtitle="Noch offene und bereits erledigte Aufgaben."
      headerRight={<Button label="Neu" variant="ghost" onPress={() => router.push('/task/new')} />}
      footer={
        completedTagGroups.length > 0 && !showCompletedTasks ? (
          <CompletedTasksToggle
            expanded={false}
            onPress={() => setShowCompletedTasks(true)}
          />
        ) : null
      }
    >
      {tasks.length === 0 ? (
        <EmptyState
          title="Noch keine Aufgaben"
          description="Erstelle die erste Aufgabe oder plane sie direkt im Heute- oder Kalender-Tab."
        />
      ) : null}

      {renderTagGroups(openTagGroups, { collapseScope: 'open' })}

      {completedTagGroups.length > 0 ? (
        <View
          style={styles.completedSection}
        >
          {showCompletedTasks ? (
            <>
              <CompletedTasksToggle
                expanded
                onPress={() => setShowCompletedTasks(false)}
              />
              <View style={styles.completedSectionHeader}>
                <Text style={styles.completedEyebrow}>Erledigte Aufgaben</Text>
                <Text style={styles.completedTitle}>Abgeschlossen</Text>
                <Text style={styles.completedDescription}>
                  Diese Aufgaben sind bewusst separat vom aktiven Aufgabenbereich abgelegt.
                </Text>
              </View>

              <View style={styles.completedSectionList}>
                {renderTagGroups(completedTagGroups, {
                  variant: 'completed',
                  collapseScope: 'completed',
                })}
              </View>
            </>
          ) : null}

        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tagGroupBlock: {
    gap: spacing.sm,
  },
  tagGroupBlockCompleted: {
    gap: spacing.sm,
  },
  tagGroupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  tagGroupToggleCompleted: {
    backgroundColor: 'rgba(21, 27, 35, 0.86)',
    borderColor: 'rgba(151, 163, 182, 0.28)',
  },
  tagGroupToggleCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  tagGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tagGroupTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  tagGroupMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tagGroupTagPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tagGroupTagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
  },
  tagGroupTagDot: {
    width: 7,
    height: 7,
    borderRadius: radii.pill,
  },
  tagGroupTagLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tagGroupAction: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
  },
  tagGroupActionCompleted: {
    color: colors.success,
  },
  tagGroupSections: {
    gap: spacing.sm,
    marginLeft: spacing.sm,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  completedSection: {
    marginTop: spacing['2xl'],
    paddingBottom: spacing.lg,
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
  completedToggle: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  completedToggleLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationColor: colors.textSecondary,
  },
  completedToggleHint: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 16,
  },
});
