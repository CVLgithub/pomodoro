import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TaskDateField } from '../../src/components/tasks/TaskDateField';
import { Button } from '../../src/components/ui/Button';
import { ChoiceChips } from '../../src/components/ui/ChoiceChips';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ListGroup, ListRow, ToggleRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { TagChips } from '../../src/components/ui/TagChips';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useTimerStore } from '../../src/store/timerStore';
import { themedStyles } from '../../src/theme/runtime';
import { TaskWeekday } from '../../src/types/task';
import { formatShortDateLabel, formatTimeLabel, getTodayDateKey } from '../../src/utils/date';
import { confirmAction } from '../../src/utils/confirm';
import {
  getDefaultTaskRecurrenceDays,
  getTaskWeekdayLabel,
  sortTaskWeekdays,
  TASK_WEEKDAY_ORDER,
} from '../../src/utils/taskRecurrence';
import { sortTagsByGroupAndName } from '../../src/utils/tagGroups';

const WEEKDAY_OPTIONS = TASK_WEEKDAY_ORDER.map((day) => ({
  value: day,
  label: getTaskWeekdayLabel(day),
}));

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  const isNew = taskId === 'new';
  const tasks = useTasksStore((state) => state.tasks);
  const occurrenceCompletions = useTasksStore((state) => state.occurrenceCompletions);
  const createTask = useTasksStore((state) => state.createTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const tags = useTagsStore((state) => state.tags);
  const selectTimerTask = useTimerStore((state) => state.selectTask);
  const task = useMemo(() => tasks.find((entry) => entry.id === taskId) ?? null, [taskId, tasks]);

  const [title, setTitle] = useState('');
  const [tagId, setTagId] = useState(GENERAL_TAG_ID);
  const [date, setDate] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [recurrenceDays, setRecurrenceDays] = useState<TaskWeekday[]>([]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const knownTagIds = useRef<Set<string> | null>(null);

  // Nur beim Öffnen befüllen, damit ein Abgleich im Hintergrund keine Eingaben überschreibt.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setTagId(task.tagId);
      setDate(task.date);
      setIsCompleted(task.isCompleted);
      setIsRecurring(task.recurrenceType === 'weekly');
      setRecurrenceDays(task.recurrenceDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  // Ein über "Neuer Tag" angelegter Tag wird nach der Rückkehr direkt gewählt.
  useEffect(() => {
    const known = knownTagIds.current;
    if (!known) {
      return;
    }

    const createdTag = tags.find((tag) => !known.has(tag.id));
    if (createdTag) {
      knownTagIds.current = null;
      setTagId(createdTag.id);
    }
  }, [tags]);

  const sortedTags = useMemo(() => sortTagsByGroupAndName(tags), [tags]);
  const completionHistory = useMemo(
    () =>
      occurrenceCompletions
        .filter((entry) => entry.taskId === taskId)
        .sort((left, right) => right.date.localeCompare(left.date)),
    [occurrenceCompletions, taskId],
  );

  const setRecurring = (value: boolean) => {
    setError(null);
    setIsRecurring(value);

    if (!value) {
      return;
    }

    const startDate = date ?? getTodayDateKey();
    setDate(startDate);
    setIsCompleted(false);
    setRecurrenceDays((current) =>
      current.length > 0 ? current : getDefaultTaskRecurrenceDays(startDate),
    );
  };

  const toggleWeekday = (day: TaskWeekday) => {
    setError(null);
    setRecurrenceDays((current) =>
      sortTaskWeekdays(
        current.includes(day) ? current.filter((entry) => entry !== day) : [...current, day],
      ),
    );
  };

  const save = async () => {
    if (!title.trim() || isSaving) {
      return;
    }

    if (isRecurring && recurrenceDays.length === 0) {
      setError('Wähle mindestens einen Wochentag aus.');
      return;
    }

    const fields = {
      title,
      tagId,
      date,
      recurrenceType: isRecurring ? ('weekly' as const) : ('none' as const),
      recurrenceDays: isRecurring ? recurrenceDays : [],
    };

    setIsSaving(true);
    try {
      if (isNew) {
        await createTask(fields);
      } else if (task) {
        await updateTask(task.id, { ...fields, isCompleted });
      }
      router.back();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Speichern fehlgeschlagen');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!task) {
      return;
    }

    const confirmed = await confirmAction({
      title: `„${task.title}“ löschen?`,
      message: 'Bereits erfasste Sessions bleiben in der Statistik erhalten.',
      confirmLabel: 'Löschen',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteTask(task.id);
      router.back();
    } catch (deleteError) {
      Alert.alert(
        'Aufgabe konnte nicht gelöscht werden',
        deleteError instanceof Error ? deleteError.message : 'Unbekannter Fehler',
      );
    }
  };

  const useInTimer = async () => {
    if (!task) {
      return;
    }

    try {
      await selectTimerTask(task.id);
      router.replace(routes.timer);
    } catch (selectError) {
      Alert.alert(
        'Aufgabe konnte nicht zugewiesen werden',
        selectError instanceof Error ? selectError.message : 'Unbekannter Fehler',
      );
    }
  };

  if (!isNew && !task) {
    return (
      <Screen title="Aufgabe" onBack={() => router.back()}>
        <EmptyState title="Aufgabe nicht gefunden" description="Diese Aufgabe existiert nicht mehr." />
      </Screen>
    );
  }

  return (
    <Screen title={isNew ? 'Neue Aufgabe' : 'Aufgabe'} onBack={() => router.back()}>
      <SectionCard>
        <TextField
          label="Titel"
          value={title}
          onChangeText={setTitle}
          placeholder="Aufgabe benennen"
          autoFocus={isNew}
        />

        <View style={styles.field}>
          <Text style={styles.label}>Tag</Text>
          <TagChips tags={sortedTags} selectedTagId={tagId} onSelect={setTagId} />
          <View style={styles.inlineAction}>
            <Button
              label="Neuer Tag"
              variant="secondary"
              compact
              onPress={() => {
                knownTagIds.current = new Set(tags.map((tag) => tag.id));
                router.push(routes.newTag);
              }}
            />
          </View>
        </View>

        <TaskDateField
          date={date}
          onChangeDate={setDate}
          label={isRecurring ? 'Startdatum' : 'Datum'}
          allowClear={!isRecurring}
        />
      </SectionCard>

      <ListGroup
        footer={
          isRecurring
            ? 'Die Aufgabe erscheint an den gewählten Wochentagen und wird für jeden Tag einzeln abgehakt.'
            : undefined
        }
      >
        <ToggleRow label="Wöchentlich wiederholen" value={isRecurring} onValueChange={setRecurring} />
        {isRecurring ? (
          <View style={styles.weekdays}>
            <ChoiceChips
              options={WEEKDAY_OPTIONS}
              selected={recurrenceDays}
              onToggle={toggleWeekday}
              multiple
            />
          </View>
        ) : null}
        {!isNew && !isRecurring ? (
          <ToggleRow label="Erledigt" value={isCompleted} onValueChange={setIsCompleted} separated />
        ) : null}
      </ListGroup>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {isNew ? null : (
          <View style={styles.action}>
            <Button label="Löschen" variant="danger" onPress={() => void remove()} />
          </View>
        )}
        <View style={styles.action}>
          <Button label="Sichern" onPress={() => void save()} disabled={!title.trim() || isSaving} />
        </View>
      </View>

      {isNew || isCompleted ? null : (
        <Button label="Im Timer verwenden" variant="secondary" onPress={() => void useInTimer()} />
      )}

      {!isNew && isRecurring && completionHistory.length > 0 ? (
        <ListGroup title={`Erledigte Tage · ${completionHistory.length}`}>
          {completionHistory.map((entry, index) => (
            <ListRow
              key={entry.date}
              label={formatShortDateLabel(entry.date)}
              value={`abgehakt um ${formatTimeLabel(entry.completedAt)}`}
              separated={index > 0}
            />
          ))}
        </ListGroup>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  field: {
    gap: 8,
  },
  label: {
    paddingHorizontal: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineAction: {
    alignSelf: 'flex-start',
  },
  weekdays: {
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  error: {
    paddingHorizontal: 8,
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
}));
