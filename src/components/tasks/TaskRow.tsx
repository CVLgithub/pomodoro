import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { formatFullDateLabel } from '../../utils/date';
import { formatTaskRecurrenceDays, isTaskRecurring } from '../../utils/taskRecurrence';
import { Ionicon } from '../ui/Ionicon';

interface TaskRowProps {
  task: Task;
  tag: Tag | undefined;
  onPress: () => void;
  onToggle: (value: boolean) => void;
  /** Zeichnet eine Trennlinie über der Zeile (für alle außer der ersten in einer Fläche). */
  separated?: boolean;
  /** `undefined` zeigt das Datum der Aufgabe, `null` blendet es aus. */
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
  separated = false,
  displayDate,
  isCompleted,
  completedAt,
  disableToggle = false,
}: TaskRowProps) => {
  const resolvedIsCompleted = isCompleted ?? task.isCompleted;
  const resolvedCompletedAt = completedAt ?? task.completedAt;
  const recurring = isTaskRecurring(task);
  const dateLabel = displayDate !== undefined ? displayDate : task.date;
  const meta = [
    tag?.name,
    recurring ? formatTaskRecurrenceDays(task.recurrenceDays) || 'wiederholend' : null,
    dateLabel,
    resolvedIsCompleted && resolvedCompletedAt
      ? `erledigt am ${formatFullDateLabel(resolvedCompletedAt)}`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[styles.container, separated ? styles.separated : null]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={`${task.title} erledigt`}
        accessibilityState={{ checked: resolvedIsCompleted, disabled: disableToggle }}
        disabled={disableToggle}
        onPress={() => onToggle(!resolvedIsCompleted)}
        style={styles.checkboxArea}
      >
        <View
          style={[
            styles.checkbox,
            resolvedIsCompleted ? styles.checkboxChecked : null,
            disableToggle ? styles.checkboxDisabled : null,
          ]}
        >
          {resolvedIsCompleted ? (
            <Ionicon name="checkmark" size={16} color={colors.onAccent} />
          ) : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.content}>
        <Text
          style={[styles.title, resolvedIsCompleted ? styles.titleCompleted : null]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {meta ? (
          <View style={styles.meta}>
            {tag ? <View style={[styles.dot, { backgroundColor: tag.color }]} /> : null}
            <Text style={styles.metaLabel} numberOfLines={1}>
              {meta}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
};

const styles = themedStyles(() => ({
  container: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
  },
  separated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkboxArea: {
    width: 54,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  content: {
    flex: 1,
    gap: 1,
    paddingVertical: 8,
    paddingRight: 16,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  titleCompleted: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metaLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
  },
}));
