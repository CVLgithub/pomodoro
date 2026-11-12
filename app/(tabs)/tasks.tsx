import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { CalendarMonthCard } from '../../src/components/calendar/CalendarMonthCard';
import { TaskRow } from '../../src/components/tasks/TaskRow';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Glass } from '../../src/components/ui/Glass';
import { Screen } from '../../src/components/ui/Screen';
import { Segmented } from '../../src/components/ui/Segmented';
import { colors } from '../../src/constants/colors';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { useUiStore } from '../../src/store/uiStore';
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
  const [draft, setDraft] = useState('');
  const tasks = useTasksStore((state) => state.tasks);
  const occurrenceCompletions = useTasksStore((state) => state.occurrenceCompletions);
  const createTask = useTasksStore((state) => state.createTask);
  const toggleTaskCompletion = useTasksStore((state) => state.toggleTaskCompletion);
  const tags = useTagsStore((state) => state.tags);
  const selectedDate = useUiStore((state) => state.selectedCalendarDate);
  const setSelectedDate = useUiStore((state) => state.setSelectedCalendarDate);
  const [visibleMonthDate, setVisibleMonthDate] = useState(selectedDate);

  const tagsById = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag])) as Record<string, Tag | undefined>,
    [tags],
  );
  const completionLookup = useMemo(
    () => buildTaskOccurrenceCompletionLookup(occurrenceCompletions),
    [occurrenceCompletions],
  );
  const usedTags = useMemo(() => {
    const usedIds = new Set(tasks.map((task) => task.tagId));
    // Wiederkehrende Aufgaben sind nie endgültig erledigt und zählen als offen.
    const openIds = new Set(
      tasks.filter((task) => isTaskRecurring(task) || !task.isCompleted).map((task) => task.tagId),
    );
    const used = tags
      .filter((tag) => usedIds.has(tag.id))
      .map((tag) => ({ tag, hasOpenTasks: openIds.has(tag.id) }));

    // Tags mit offenen Aufgaben stehen vorn; innerhalb bleibt die Reihenfolge.
    return [...used.filter((entry) => entry.hasOpenTasks), ...used.filter((entry) => !entry.hasOpenTasks)];
  }, [tags, tasks]);
  const activeFilter = tagFilter && usedTags.some((entry) => entry.tag.id === tagFilter) ? tagFilter : null;

  const { sections, completed } = useMemo(() => {
    const todayKey = getTodayDateKey();
    const visible = activeFilter ? tasks.filter((task) => task.tagId === activeFilter) : tasks;
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
        title: 'Überfällig',
        entries: open
          .filter((task) => task.date !== null && task.date < todayKey)
          .map(dated)
          .sort(byDateThenTitle),
      },
      { title: 'Heute', entries: today },
      {
        title: 'Demnächst',
        entries: open
          .filter((task) => task.date !== null && task.date > todayKey)
          .map(dated)
          .sort(byDateThenTitle),
      },
      {
        title: 'Wiederkehrend',
        entries: visible
          .filter((task) => isTaskRecurring(task) && !todayIds.has(task.id))
          .map((task) => ({ ...plainEntry(task, null), isCompleted: false, disableToggle: true }))
          .sort(byTitle),
      },
      {
        title: 'Ohne Datum',
        entries: open
          .filter((task) => task.date === null)
          .map((task) => plainEntry(task, null))
          .sort(byTitle),
      },
    ];

    return {
      sections: result.filter((section) => section.entries.length > 0),
      completed: visible
        .filter((task) => task.isCompleted && !isTaskRecurring(task))
        .map((task) => plainEntry(task, null))
        .sort(byTitle),
    };
  }, [activeFilter, completionLookup, tasks]);

  const dayEntries = useMemo(
    () => getResolvedTaskOccurrencesForDate(tasks, selectedDate, completionLookup).map(toEntry),
    [completionLookup, selectedDate, tasks],
  );
  const markedDates = useMemo(() => {
    const monthStart = formatDateKey(getMonthStart(parseDateKey(visibleMonthDate)));
    const monthEnd = formatDateKey(getMonthEnd(parseDateKey(visibleMonthDate)));

    return getResolvedTaskOccurrencesInRange(tasks, monthStart, monthEnd, completionLookup).reduce<
      Record<string, { marked?: boolean; dotColor?: string }>
    >((accumulator, occurrence) => {
      accumulator[occurrence.occurrenceDate] = {
        marked: true,
        dotColor: tagsById[occurrence.task.tagId]?.color ?? colors.textSecondary,
      };
      return accumulator;
    }, {});
  }, [completionLookup, tagsById, tasks, visibleMonthDate]);

  const reportError = (title: string) => (error: unknown) => {
    Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
  };

  const submitDraft = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    setDraft('');
    void createTask({ title, date: selectedDate, tagId: GENERAL_TAG_ID }).catch(
      reportError('Aufgabe konnte nicht erstellt werden'),
    );
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
        onPress={() => router.push(`/task/${entry.task.id}`)}
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
          onPress={() => router.push('/task/new')}
        />
      }
    >
      <Segmented label="Ansicht" options={VIEW_OPTIONS} value={view} onChange={setView} />

      {view === 'list' ? (
        <>
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

          {sections.length === 0 && completed.length === 0 ? (
            <EmptyState
              title="Noch keine Aufgaben"
              description="Lege oben rechts die erste Aufgabe an."
            />
          ) : null}
          {sections.length === 0 && completed.length > 0 ? (
            <EmptyState title="Alles erledigt" description="Es ist keine Aufgabe mehr offen." />
          ) : null}

          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {section.title}
              </Text>
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
              <View style={[styles.composer, dayEntries.length > 0 ? styles.composerSeparated : null]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Aufgabe für diesen Tag hinzufügen"
                  onPress={submitDraft}
                  style={styles.composerIcon}
                >
                  <Ionicons name="add" size={22} color={colors.textPrimary} />
                </Pressable>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  onSubmitEditing={submitDraft}
                  placeholder="Neue Aufgabe für diesen Tag"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Neue Aufgabe für diesen Tag"
                  returnKeyType="done"
                  style={styles.composerInput}
                />
              </View>
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
  composer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  composerSeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerIcon: {
    width: 54,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerInput: {
    flex: 1,
    minHeight: 44,
    paddingRight: 16,
    color: colors.textPrimary,
    fontSize: 17,
  },
}));
