import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { CalendarMonthCard } from '../../src/components/calendar/CalendarMonthCard';
import { TaskComposer } from '../../src/components/tasks/TaskComposer';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Glass } from '../../src/components/ui/Glass';
import { Screen } from '../../src/components/ui/Screen';
import { Segmented } from '../../src/components/ui/Segmented';
import { colors } from '../../src/constants/colors';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { showToast, useUiStore } from '../../src/store/uiStore';
import { themedStyles } from '../../src/theme/runtime';
import { Tag } from '../../src/types/tag';
import { ResolvedTaskOccurrence, Task } from '../../src/types/task';
import {
  formatDateKey,
  formatShortDateLabel,
  getMonthEnd,
  getMonthStart,
  getTodayDateKey,
  parseDateKey,
} from '../../src/utils/date';
import {
  buildTaskOccurrenceCompletionLookup,
  getResolvedTaskOccurrencesForDate,
  getResolvedTaskOccurrencesInRange,
  isTaskRecurring,
} from '../../src/utils/taskRecurrence';
import { haptics } from '../../src/utils/haptics';
import { isTagCompleted } from '../../src/utils/tagGroups';

type TasksView = 'list' | 'calendar';

const VIEW_OPTIONS = [
  { value: 'list', label: 'Liste' },
  { value: 'calendar', label: 'Kalender' },
] as const;

/** Eine Zeile der Liste: eine Aufgabe, bei Wiederholungen an einem bestimmten Tag. */
type Entry = {
  key: string;
  task: Task;
  /** Gesetzt, wenn die Zeile für ein konkretes Datum einer wiederholenden Aufgabe steht. */
  occurrenceDate?: string;
  isCompleted: boolean;
  completedAt: string | null;
  displayDate: string | null;
  disableToggle?: boolean;
};

type Section = {
  key: 'overdue' | 'today' | 'upcoming' | 'recurring' | 'undated';
  title: string;
  entries: Entry[];
};

const byTitle = (left: Entry, right: Entry) =>
  left.task.title.localeCompare(right.task.title, 'de-DE');

const byDateThenTitle = (left: Entry, right: Entry) =>
  (left.task.date ?? '').localeCompare(right.task.date ?? '') || byTitle(left, right);

const toEntry = (occurrence: ResolvedTaskOccurrence): Entry => {
  const recurring = isTaskRecurring(occurrence.task);

  return {
    key: occurrence.key,
    task: occurrence.task,
    occurrenceDate: recurring ? occurrence.occurrenceDate : undefined,
    isCompleted: recurring ? occurrence.isCompleted : occurrence.task.isCompleted,
    completedAt: recurring ? occurrence.completedAt : occurrence.task.completedAt,
    displayDate: null,
  };
};

const plainEntry = (task: Task, displayDate: string | null): Entry => ({
  key: task.id,
  task,
  isCompleted: task.isCompleted,
  completedAt: task.completedAt,
  displayDate,
});

export default function TasksScreen() {
  const router = useRouter();
  const [view, setView] = useState<TasksView>('list');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showCompletedTagTasks, setShowCompletedTagTasks] = useState(false);
  const tasks = useTasksStore((state) => state.tasks);
  const occurrenceCompletions = useTasksStore((state) => state.occurrenceCompletions);
  const createTask = useTasksStore((state) => state.createTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const tags = useTagsStore((state) => state.tags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const selectedDate = useUiStore((state) => state.selectedCalendarDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedCalendarDate);
  const [visibleMonthDate, setVisibleMonthDate] = useState(selectedDate);

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])) as Record<string, Tag | undefined>,
    [tags],
  );
  const activeTagTasks = useMemo(
    () => tasks.filter((task) => !isTagCompleted(tagsById[task.tagId], tagGroups)),
    [tagGroups, tagsById, tasks],
  );
  const completionLookup = useMemo(
    () => buildTaskOccurrenceCompletionLookup(occurrenceCompletions),
    [occurrenceCompletions],
  );
  const usedTags = useMemo(() => {
    const usedIds = new Set(activeTagTasks.map((task) => task.tagId));
    // Wiederkehrende Aufgaben sind nie endgültig erledigt und zählen als offen.
    const openIds = new Set(
      activeTagTasks
        .filter((task) => isTaskRecurring(task) || !task.isCompleted)
        .map((task) => task.tagId),
    );
    const used = tags
      .filter((tag) => !isTagCompleted(tag, tagGroups) && usedIds.has(tag.id))
      .map((tag) => ({ tag, hasOpenTasks: openIds.has(tag.id) }));

    // Tags mit offenen Aufgaben stehen vorn; innerhalb bleibt die Reihenfolge.
    return [...used.filter((entry) => entry.hasOpenTasks), ...used.filter((entry) => !entry.hasOpenTasks)];
  }, [activeTagTasks, tagGroups, tags]);
  const activeFilter = tagFilter && usedTags.some((entry) => entry.tag.id === tagFilter) ? tagFilter : null;

  const { sections, completed, completedTagEntries } = useMemo(() => {
    const todayKey = getTodayDateKey();
    const visible = activeFilter
      ? activeTagTasks.filter((task) => task.tagId === activeFilter)
      : activeTagTasks;
    const today = getResolvedTaskOccurrencesForDate(visible, todayKey, completionLookup)
      .map(toEntry)
      .filter((entry) => !entry.isCompleted);
    const todayIds = new Set(today.map((entry) => entry.task.id));
    const open = visible.filter(
      (task) => !isTaskRecurring(task) && !task.isCompleted && !todayIds.has(task.id),
    );
    const dated = (task: Task) => plainEntry(task, task.date ? formatShortDateLabel(task.date) : null);

    const result: Section[] = [
      {
        key: 'overdue',
        title: 'Überfällig',
        entries: open
          .filter((task) => task.date !== null && task.date < todayKey)
          .map(dated)
          .sort(byDateThenTitle),
      },
      { key: 'today', title: 'Heute', entries: today },
      {
        key: 'upcoming',
        title: 'Demnächst',
        entries: open
          .filter((task) => task.date !== null && task.date > todayKey)
          .map(dated)
          .sort(byDateThenTitle),
      },
      {
        key: 'recurring',
        title: 'Wiederkehrend',
        entries: visible
          .filter((task) => isTaskRecurring(task) && !todayIds.has(task.id))
          .map((task) => ({ ...plainEntry(task, null), isCompleted: false, disableToggle: true }))
          .sort(byTitle),
      },
      {
        key: 'undated',
        title: 'Ohne Datum',
        entries: open
          .filter((task) => task.date === null)
          .map((task) => plainEntry(task, null))
          .sort(byTitle),
      },
    ];

    const fromCompletedTags = activeFilter
      ? []
      : tasks
          .filter((task) => isTagCompleted(tagsById[task.tagId], tagGroups))
          .map((task) => ({
            ...plainEntry(task, task.date ? formatShortDateLabel(task.date) : null),
            disableToggle: isTaskRecurring(task),
          }))
          .sort(byTitle);

    return {
      sections: result.filter((section) => section.entries.length > 0),
      completed: visible
        .filter((task) => task.isCompleted && !isTaskRecurring(task))
        .map((task) => plainEntry(task, null))
        .sort(byTitle),
      completedTagEntries: fromCompletedTags,
    };
  }, [activeFilter, activeTagTasks, completionLookup, tagGroups, tagsById, tasks]);

  const dayEntries = useMemo(
    () => getResolvedTaskOccurrencesForDate(activeTagTasks, selectedDate, completionLookup).map(toEntry),
    [activeTagTasks, completionLookup, selectedDate],
  );
  const markedDates = useMemo(() => {
    const monthStart = formatDateKey(getMonthStart(parseDateKey(visibleMonthDate)));
    const monthEnd = formatDateKey(getMonthEnd(parseDateKey(visibleMonthDate)));

    return getResolvedTaskOccurrencesInRange(activeTagTasks, monthStart, monthEnd, completionLookup).reduce<
      Record<string, { marked?: boolean; dotColor?: string }>
    >((accumulator, occurrence) => {
      accumulator[occurrence.occurrenceDate] = {
        marked: true,
        dotColor: tagsById[occurrence.task.tagId]?.color ?? colors.textSecondary,
      };
      return accumulator;
    }, {});
  }, [activeTagTasks, completionLookup, tagsById, visibleMonthDate]);

  const reportError = (title: string) => (error: unknown) => {
    Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
  };

  const addTaskForSelectedDate = (title: string) => {
    void createTask({ title, date: selectedDate, tagId: GENERAL_TAG_ID }).catch(
      reportError('Aufgabe konnte nicht erstellt werden'),
    );
  };

  // In der Liste landet eine schnell erfasste Aufgabe ohne Datum im gefilterten
  // Tag. Sie steht dann unten unter "Ohne Datum"; die Meldung führt direkt hin.
  const addTaskFromList = (title: string) => {
    void createTask({ title, date: null, tagId: activeFilter ?? GENERAL_TAG_ID })
      .then((task) =>
        showToast({
          message: `„${task.title}“ angelegt`,
          tone: 'success',
          actionLabel: 'Bearbeiten',
          onAction: () => router.push(routes.task(task.id)),
        }),
      )
      .catch(reportError('Aufgabe konnte nicht erstellt werden'));
  };

  const moveOverdueToToday = async (entries: Entry[]) => {
    const todayKey = getTodayDateKey();
    const previous = entries.map((entry) => ({ id: entry.task.id, date: entry.task.date }));

    try {
      for (const entry of entries) {
        await updateTask(entry.task.id, { date: todayKey });
      }
    } catch (error) {
      reportError('Aufgaben konnten nicht verschoben werden')(error);
      return;
    }

    haptics.success();
    showToast({
      message:
        entries.length === 1
          ? '1 Aufgabe auf heute verschoben'
          : `${entries.length} Aufgaben auf heute verschoben`,
      actionLabel: 'Rückgängig',
      onAction: () => {
        void (async () => {
          for (const entry of previous) {
            await updateTask(entry.id, { date: entry.date });
          }
        })().catch(reportError('Verschieben konnte nicht rückgängig gemacht werden'));
      },
    });
  };

  const renderRows = (entries: Entry[]) =>
    entries.map((entry, index) => (
      <TaskRow
        key={entry.key}
        task={entry.task}
        tag={tagsById[entry.task.tagId]}
        separated={index > 0}
        isCompleted={entry.isCompleted}
        completedAt={entry.completedAt}
        displayDate={entry.displayDate}
        disableToggle={entry.disableToggle}
        onPress={() => router.push(routes.task(entry.task.id))}
        onToggle={(value) =>
          void toggleTaskCompletion(
            entry.task.id,
            value,
            entry.occurrenceDate ? { date: entry.occurrenceDate } : undefined,
          ).catch(reportError('Aufgabe konnte nicht geändert werden'))
        }
      />
    ));

  const selectedDateLabel = `${selectedDate === getTodayDateKey() ? 'Heute · ' : ''}${formatShortDateLabel(selectedDate)}`;

  return (
    <Screen
      title="Aufgaben"
      headerRight={
        <CircleButton
          icon="add"
          label="Neue Aufgabe"
          variant="primary"
          onPress={() => router.push(routes.newTask)}
        />
      }
    >
      <Segmented label="Ansicht" options={VIEW_OPTIONS} value={view} onChange={setView} />

      {view === 'list' ? (
        <>
          <Glass radius={26}>
            <TaskComposer
              placeholder={
                activeFilter
                  ? `Aufgabe in „${tagsById[activeFilter]?.name ?? 'Tag'}“ hinzufügen`
                  : 'Aufgabe hinzufügen'
              }
              onSubmit={addTaskFromList}
            />
          </Glass>

          {usedTags.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterScroll}
              contentContainerStyle={styles.filters}
            >
              {[null, ...usedTags].map((entry) => {
                const tag = entry?.tag;
                const selected = (tag?.id ?? null) === activeFilter;
                // Tags, bei denen nichts mehr offen ist, treten zurück.
                const quiet = entry !== null && !entry.hasOpenTasks && !selected;

                return (
                  <Pressable
                    key={tag?.id ?? 'all'}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      if (!selected) {
                        haptics.selection();
                      }

                      setTagFilter(tag?.id ?? null);
                    }}
                    style={[
                      styles.filter,
                      selected ? styles.filterSelected : null,
                      quiet ? styles.filterQuiet : null,
                    ]}
                  >
                    {tag ? <View style={[styles.filterDot, { backgroundColor: tag.color }]} /> : null}
                    <Text style={[styles.filterLabel, selected ? styles.filterLabelSelected : null]}>
                      {tag?.name ?? 'Alle'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {sections.length === 0 && completed.length === 0 && completedTagEntries.length === 0 ? (
            <EmptyState
              title="Noch keine Aufgaben"
              description="Tippe oben einen Titel ein. Datum und Tag lassen sich danach ergänzen."
            />
          ) : null}
          {sections.length === 0 && (completed.length > 0 || completedTagEntries.length > 0) ? (
            <EmptyState title="Alles erledigt" description="Es ist keine Aufgabe mehr offen." />
          ) : null}

          {sections.map((section) => (
            <View key={section.key} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {section.title} · {section.entries.length}
                </Text>
                {section.key === 'overdue' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Alle überfälligen Aufgaben auf heute verschieben"
                    onPress={() => void moveOverdueToToday(section.entries)}
                    hitSlop={8}
                    style={({ pressed }) => [styles.sectionAction, pressed ? styles.pressed : null]}
                  >
                    <Text style={styles.sectionActionLabel}>Alle auf heute</Text>
                  </Pressable>
                ) : null}
              </View>
              <Glass radius={26}>{renderRows(section.entries)}</Glass>
            </View>
          ))}

          {completed.length > 0 ? (
            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompleted }}
                onPress={() => setShowCompleted((value) => !value)}
              >
                <Glass radius={25} style={styles.completedToggle}>
                  <Text style={styles.completedLabel}>Erledigt</Text>
                  <Text style={styles.completedCount}>{completed.length}</Text>
                  <Ionicons
                    name={showCompleted ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Glass>
              </Pressable>
              {showCompleted ? <Glass radius={26}>{renderRows(completed)}</Glass> : null}
            </View>
          ) : null}

          {completedTagEntries.length > 0 ? (
            <View style={styles.section}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showCompletedTagTasks }}
                onPress={() => setShowCompletedTagTasks((value) => !value)}
              >
                <Glass radius={25} style={styles.completedToggle}>
                  <Text style={styles.completedLabel}>Abgeschlossen</Text>
                  <Text style={styles.completedCount}>{completedTagEntries.length}</Text>
                  <Ionicons
                    name={showCompletedTagTasks ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </Glass>
              </Pressable>
              {showCompletedTagTasks ? (
                <Glass radius={26}>{renderRows(completedTagEntries)}</Glass>
              ) : null}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <CalendarMonthCard
            selectedDate={selectedDate}
            visibleMonthDate={visibleMonthDate}
            markedDates={markedDates}
            onSelectDate={(dateKey) => {
              setSelectedDate(dateKey);
              setVisibleMonthDate(dateKey);
            }}
            onChangeVisibleMonth={setVisibleMonthDate}
          />
          <View style={styles.section}>
            <View style={styles.dayHeader}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {selectedDateLabel}
              </Text>
              <Text style={styles.sectionTitle}>
                {dayEntries.length === 1 ? '1 Aufgabe' : `${dayEntries.length} Aufgaben`}
              </Text>
            </View>
            <Glass radius={26}>
              {renderRows(dayEntries)}
              <TaskComposer
                placeholder="Neue Aufgabe für diesen Tag"
                onSubmit={addTaskForSelectedDate}
                separated={dayEntries.length > 0}
              />
            </Glass>
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  filterScroll: {
    marginHorizontal: -16,
    flexGrow: 0,
  },
  filters: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filter: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassLine,
    backgroundColor: colors.surfaceElevated,
  },
  filterSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterQuiet: {
    opacity: 0.5,
  },
  filterDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  filterLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  filterLabelSelected: {
    color: colors.onAccent,
  },
  section: {
    gap: 8,
    paddingTop: 4,
  },
  sectionTitle: {
    paddingHorizontal: 8,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionAction: {
    paddingHorizontal: 8,
  },
  sectionActionLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
  completedToggle: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  completedLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  completedCount: {
    color: colors.textSecondary,
    fontSize: 17,
  },
}));
