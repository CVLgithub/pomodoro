import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { formatFullDateLabel } from '../../utils/date';
import { formatTaskRecurrenceDays, isTaskRecurring } from '../../utils/taskRecurrence';
import { Ionicon } from '../ui/Ionicon';
import { TagPill } from '../ui/TagPill';

interface TaskRowProps {
  task: Task;
  tag: Tag | undefined;
  onPress: () => void;
  onToggle: (value: boolean) => void;
  variant?: 'default' | 'completed';
  displayDate?: string | null;
  isCompleted?: boolean;
  completedAt?: string | null;
  disableToggle?: boolean;
}

export const TaskRow = ({
  task,
  tag,
  onPress,
  onToggle,
  variant = 'default',
  displayDate,
  isCompleted,
  completedAt,
  disableToggle = false,
}: TaskRowProps) => {
  const resolvedIsCompleted = isCompleted ?? task.isCompleted;
  const resolvedCompletedAt = completedAt ?? task.completedAt;
  const recurring = isTaskRecurring(task);
  const completedAtLabel =
    resolvedIsCompleted && resolvedCompletedAt
      ? `Erledigt am ${formatFullDateLabel(resolvedCompletedAt)}`
      : null;
  const dateLabel = displayDate !== undefined ? displayDate : task.date;
  const recurrenceLabel = recurring ? formatTaskRecurrenceDays(task.recurrenceDays) : null;

  return (
    <Pressable
      style={[
        styles.container,
        variant === 'completed' ? styles.containerCompleted : null,
      ]}
      onPress={onPress}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: resolvedIsCompleted, disabled: disableToggle }}
        disabled={disableToggle}
        onPress={(event) => {
          event.stopPropagation();
          if (disableToggle) {
            return;
          }

          onToggle(!resolvedIsCompleted);
        }}
        style={[
          styles.checkbox,
          resolvedIsCompleted ? styles.checkboxChecked : null,
          disableToggle ? styles.checkboxDisabled : null,
        ]}
      >
        {resolvedIsCompleted ? (
          <Ionicon name="checkmark" size={16} color={colors.background} />
        ) : null}
      </Pressable>
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            resolvedIsCompleted ? styles.titleCompleted : null,
            variant === 'completed' ? styles.titleCompletedRow : null,
          ]}
        >
          {task.title}
        </Text>
        <View style={styles.meta}>
          {tag ? <TagPill label={tag.name} color={tag.color} /> : null}
          {recurring ? (
            <View style={styles.recurrenceBadge}>
              <Ionicon name="repeat" size={12} color={colors.accent} />
              <Text style={styles.recurrenceLabel}>
                {recurrenceLabel ? `Wiederholend - ${recurrenceLabel}` : 'Wiederholend'}
              </Text>
            </View>
          ) : null}
          {dateLabel ? <Text style={styles.dateLabel}>{dateLabel}</Text> : null}
          {completedAtLabel ? (
            <Text style={styles.completedAtLabel}>{completedAtLabel}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  containerCompleted: {
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(70, 195, 123, 0.18)',
    opacity: 0.8,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
  },
  checkboxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkboxDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  titleCompleted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  titleCompletedRow: {
    color: colors.textSecondary,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  recurrenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(94, 162, 255, 0.28)',
    backgroundColor: 'rgba(94, 162, 255, 0.12)',
  },
  recurrenceLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  completedAtLabel: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
});
