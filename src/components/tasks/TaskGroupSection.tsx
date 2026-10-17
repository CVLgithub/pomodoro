import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { SectionCard } from '../ui/SectionCard';
import { TaskRow } from './TaskRow';

interface TaskGroupSectionProps {
  title: string;
  subtitle?: string;
  tasks: Task[];
  tagsById: Record<string, Tag>;
  onToggleTask: (task: Task, nextValue: boolean) => void;
  onPressTask: (task: Task) => void;
  variant?: 'default' | 'completed';
  accentColor?: string;
  getTaskRowProps?: (
    task: Task,
  ) => {
    displayDate?: string | null;
    disableToggle?: boolean;
  };
}

export const TaskGroupSection = ({
  title,
  subtitle,
  tasks,
  tagsById,
  onToggleTask,
  onPressTask,
  variant = 'default',
  accentColor,
  getTaskRowProps,
}: TaskGroupSectionProps) => (
  <SectionCard
    style={[
      accentColor ? styles.groupedCard : null,
      variant === 'completed' ? styles.completedCard : null,
    ]}
  >
    <View style={styles.header}>
      {accentColor ? (
        <View style={[styles.accentRail, { backgroundColor: accentColor }]} />
      ) : null}
      <View style={styles.headerCopy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle ?? `${tasks.length} Einträge`}</Text>
      </View>
    </View>
    <View style={styles.taskList}>
      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>Noch keine Aufgaben.</Text>
      ) : (
        tasks.map((task) => {
          const taskRowProps = getTaskRowProps?.(task);

          return (
            <TaskRow
              key={task.id}
              task={task}
              tag={tagsById[task.tagId]}
              onPress={() => onPressTask(task)}
              onToggle={(value) => onToggleTask(task, value)}
              variant={variant}
              displayDate={taskRowProps?.displayDate}
              disableToggle={taskRowProps?.disableToggle}
            />
          );
        })
      )}
    </View>
  </SectionCard>
);

const styles = StyleSheet.create({
  groupedCard: {
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accentRail: {
    width: 4,
    height: 30,
    borderRadius: radii.pill,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  taskList: {
    gap: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  completedCard: {
    backgroundColor: colors.surfaceMuted,
    borderColor: 'rgba(95, 211, 141, 0.22)',
  },
});
