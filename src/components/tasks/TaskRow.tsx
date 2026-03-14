import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { TagPill } from '../ui/TagPill';

interface TaskRowProps {
  task: Task;
  tag: Tag | undefined;
  onPress: () => void;
  onToggle: (value: boolean) => void;
}

export const TaskRow = ({ task, tag, onPress, onToggle }: TaskRowProps) => (
  <Pressable style={styles.container} onPress={onPress}>
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.isCompleted }}
      onPress={(event) => {
        event.stopPropagation();
        onToggle(!task.isCompleted);
      }}
      style={[
        styles.checkbox,
        task.isCompleted ? styles.checkboxChecked : null,
      ]}
    >
      {task.isCompleted ? (
        <Ionicons name="checkmark" size={16} color={colors.background} />
      ) : null}
    </Pressable>
    <View style={styles.content}>
      <Text style={[styles.title, task.isCompleted ? styles.titleCompleted : null]}>
        {task.title}
      </Text>
      <View style={styles.meta}>
        {tag ? <TagPill label={tag.name} color={tag.color} /> : null}
        {task.date ? <Text style={styles.dateLabel}>{task.date}</Text> : null}
      </View>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
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
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  dateLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
