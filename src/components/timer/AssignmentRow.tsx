import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { FREE_SESSION_TITLE } from '../../constants/config';
import { themedStyles } from '../../theme/runtime';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { formatShortDateLabel } from '../../utils/date';
import { formatTaskRecurrenceDays, isTaskRecurring } from '../../utils/taskRecurrence';
import { ModalSheet } from '../ui/ModalSheet';
import { TagChips } from '../ui/TagChips';

interface AssignmentRowProps {
  tasks: Task[];
  tags: Tag[];
  selectedTaskId: string | null;
  selectedTagId: string;
  onSelectTask: (taskId: string | null) => Promise<void> | void;
  onSelectFreeTag: (tagId: string) => Promise<void> | void;
}

const sortTasks = (left: Task, right: Task) => {
  if (left.date && right.date && left.date !== right.date) {
    return left.date.localeCompare(right.date);
  }

  if (left.date && !right.date) {
    return -1;
  }

  if (!left.date && right.date) {
    return 1;
  }

  return left.title.localeCompare(right.title, 'de-DE');
};

/**
 * Zeigt, woran gerade gearbeitet wird, und öffnet eine einzige Auswahl für
 * Aufgabe oder freie Session mit Tag.
 */
export const AssignmentRow = ({
  tasks,
  tags,
  selectedTaskId,
  selectedTagId,
  onSelectTask,
  onSelectFreeTag,
}: AssignmentRowProps) => {
  const [pickerVisible, setPickerVisible] = useState(false);

  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const activeTag = tagsById.get(selectedTask?.tagId ?? selectedTagId) ?? null;
  const openTasks = useMemo(
    () => tasks.filter((task) => !task.isCompleted).sort(sortTasks),
    [tasks],
  );

  const choose = async (work: () => Promise<void> | void) => {
    await work();
    setPickerVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Zuordnung: ${selectedTask?.title ?? FREE_SESSION_TITLE}${
          activeTag ? `, ${activeTag.name}` : ''
        }. Ändern`}
        onPress={() => setPickerVisible(true)}
        style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
      >
        <View style={[styles.dot, { backgroundColor: activeTag?.color ?? colors.textMuted }]} />
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={1}>
            {selectedTask?.title ?? FREE_SESSION_TITLE}
          </Text>
          {activeTag ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {activeTag.name}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      </Pressable>

      <ModalSheet
        visible={pickerVisible}
        title="Zuordnung"
        onClose={() => setPickerVisible(false)}
        swipeToClose
      >
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Freie Session</Text>
          <TagChips
            tags={tags}
            selectedTagId={selectedTask ? null : selectedTagId}
            onSelect={(tagId) => void choose(() => onSelectFreeTag(tagId))}
          />

          <Text style={[styles.heading, styles.headingSpaced]}>Aufgaben</Text>
          {openTasks.length === 0 ? (
            <Text style={styles.empty}>Keine offenen Aufgaben.</Text>
          ) : null}
          {openTasks.map((task, index) => {
            const tag = tagsById.get(task.tagId);
            const selected = task.id === selectedTaskId;
            const schedule = isTaskRecurring(task)
              ? formatTaskRecurrenceDays(task.recurrenceDays)
              : task.date
                ? formatShortDateLabel(task.date)
                : null;
            const meta = [tag?.name, schedule].filter(Boolean).join(' · ');

            return (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => void choose(() => onSelectTask(task.id))}
                style={[styles.taskRow, index > 0 ? styles.taskRowSeparated : null]}
              >
                <View style={[styles.dot, { backgroundColor: tag?.color ?? colors.textMuted }]} />
                <View style={styles.copy}>
                  <Text style={styles.taskTitle} numberOfLines={1}>
                    {task.title}
                  </Text>
                  {meta ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {meta}
                    </Text>
                  ) : null}
                </View>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.textPrimary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </ModalSheet>
    </>
  );
};

const styles = themedStyles(() => ({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
  },
  pressed: {
    opacity: 0.8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  list: {
    maxHeight: 440,
  },
  heading: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    paddingBottom: 8,
  },
  headingSpaced: {
    paddingTop: 20,
  },
  taskRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  taskRowSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  taskTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingVertical: 8,
  },
}));
