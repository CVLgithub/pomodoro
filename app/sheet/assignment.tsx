import { useMemo } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';

import { Sheet } from '../../src/components/ui/Sheet';
import { TagChips } from '../../src/components/ui/TagChips';
import { colors } from '../../src/constants/colors';
import { useSheetClose } from '../../src/hooks/useSheet';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useStopwatchStore } from '../../src/store/stopwatchStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';
import { themedStyles } from '../../src/theme/runtime';
import { Task } from '../../src/types/task';
import { formatShortDateLabel } from '../../src/utils/date';
import { haptics } from '../../src/utils/haptics';
import { formatTagWithGroup } from '../../src/utils/tagGroups';
import { formatTaskRecurrenceDays, isTaskRecurring } from '../../src/utils/taskRecurrence';

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
 * Auswahl, woran gearbeitet wird: eine offene Aufgabe oder eine freie Session
 * mit Tag. `target` bestimmt, ob die Wahl für den Timer oder die Stoppuhr gilt.
 */
export default function AssignmentSheet() {
  const { target } = useLocalSearchParams<{ target?: string }>();
  const forStopwatch = target === 'stopwatch';
  const close = useSheetClose();
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const timerTaskId = useTimerStore((state) => state.selectedTaskId);
  const timerTagId = useTimerStore((state) => state.selectedTagId);
  const stopwatchTaskId = useStopwatchStore((state) => state.selectedTaskId);
  const stopwatchTagId = useStopwatchStore((state) => state.selectedTagId);
  const selectedTaskId = forStopwatch ? stopwatchTaskId : timerTaskId;
  const selectedTagId = forStopwatch ? stopwatchTagId : timerTagId;

  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const openTasks = useMemo(
    () => tasks.filter((task) => !task.isCompleted).sort(sortTasks),
    [tasks],
  );
  const hasSelectedTask = tasks.some((task) => task.id === selectedTaskId);

  // Nach der Wahl schließt das Sheet. Schlägt das Speichern fehl, bleibt es
  // offen, damit die Auswahl wiederholt werden kann.
  const choose = async (work: () => Promise<void>, errorTitle: string) => {
    try {
      await work();
      close();
    } catch (error) {
      Alert.alert(errorTitle, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const chooseTask = (taskId: string) =>
    choose(
      () =>
        forStopwatch
          ? useStopwatchStore.getState().selectTask(taskId)
          : useTimerStore.getState().selectTask(taskId),
      'Aufgabe konnte nicht zugewiesen werden',
    );

  const chooseFreeTag = (tagId: string) =>
    choose(
      () =>
        forStopwatch
          ? useStopwatchStore.getState().setFreeSessionTag(tagId)
          : useTimerStore.getState().setFreeSessionTag(tagId),
      'Tag konnte nicht gesetzt werden',
    );

  return (
    // Die Aufgabenliste kann beliebig lang werden; das Sheet bleibt trotzdem kompakt.
    <Sheet title="Zuordnung" maxBodyHeightRatio={0.55}>
      <View>
        <Text style={styles.heading}>Aufgaben</Text>
        {openTasks.length === 0 ? <Text style={styles.empty}>Keine offenen Aufgaben.</Text> : null}
        {openTasks.map((task, index) => {
          const tag = tagsById.get(task.tagId);
          const selected = task.id === selectedTaskId;
          const schedule = isTaskRecurring(task)
            ? formatTaskRecurrenceDays(task.recurrenceDays)
            : task.date
              ? formatShortDateLabel(task.date)
              : null;
          const meta = [tag ? formatTagWithGroup(tag, tagGroups) : null, schedule]
            .filter(Boolean)
            .join(' · ');

          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => {
                haptics.selection();
                void chooseTask(task.id);
              }}
              style={({ pressed }) => [
                styles.taskRow,
                index > 0 ? styles.taskRowSeparated : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: tag?.color ?? colors.textMuted }]} />
              <View style={styles.copy}>
                <Text style={styles.taskTitle} numberOfLines={1}>
                  {task.title}
                </Text>
                {meta ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
              {selected ? <Ionicons name="checkmark" size={20} color={colors.textPrimary} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View>
        <Text style={styles.heading}>Freie Session</Text>
        <TagChips
          tags={tags}
          selectedTagId={hasSelectedTask ? null : selectedTagId}
          onSelect={(tagId) => void chooseFreeTag(tagId)}
        />
      </View>
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  heading: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    paddingBottom: 8,
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
  pressed: {
    opacity: 0.6,
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
  taskTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '500',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingVertical: 8,
  },
}));
