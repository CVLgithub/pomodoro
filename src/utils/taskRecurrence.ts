import {
  ResolvedTaskOccurrence,
  Task,
  TaskOccurrenceCompletion,
  TaskRecurrenceType,
  TaskWeekday,
} from '../types/task';
import { addDays, formatDateKey, parseDateKey } from './date';

export const TASK_WEEKDAY_ORDER: TaskWeekday[] = [1, 2, 3, 4, 5, 6, 0];

const TASK_WEEKDAY_LABELS: Record<TaskWeekday, string> = {
  0: 'So',
  1: 'Mo',
  2: 'Di',
  3: 'Mi',
  4: 'Do',
  5: 'Fr',
  6: 'Sa',
};

const WEEKLY_RECURRENCE_TYPE: TaskRecurrenceType = 'weekly';

export const normalizeTaskRecurrenceType = (
  value?: string | null,
): TaskRecurrenceType => (value === WEEKLY_RECURRENCE_TYPE ? WEEKLY_RECURRENCE_TYPE : 'none');

const normalizeTaskWeekday = (value: unknown): TaskWeekday | null => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 6) {
    return null;
  }

  return value as TaskWeekday;
};

export const sortTaskWeekdays = (days: readonly TaskWeekday[]): TaskWeekday[] => {
  const uniqueDays = Array.from(new Set(days));

  return TASK_WEEKDAY_ORDER.filter((day) => uniqueDays.includes(day));
};

export const normalizeTaskWeekdays = (value?: unknown): TaskWeekday[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return sortTaskWeekdays(
    value
      .map((entry) => normalizeTaskWeekday(entry))
      .filter((entry): entry is TaskWeekday => entry !== null),
  );
};

export const normalizeTaskRecurrence = (
  recurrenceType?: string | null,
  recurrenceDays?: unknown,
): {
  recurrenceType: TaskRecurrenceType;
  recurrenceDays: TaskWeekday[];
} => {
  const normalizedType = normalizeTaskRecurrenceType(recurrenceType);
  const normalizedDays = normalizedType === WEEKLY_RECURRENCE_TYPE
    ? normalizeTaskWeekdays(recurrenceDays)
    : [];

  return {
    recurrenceType: normalizedDays.length > 0 ? normalizedType : 'none',
    recurrenceDays: normalizedType === WEEKLY_RECURRENCE_TYPE ? normalizedDays : [],
  };
};

export const serializeTaskRecurrenceDays = (days: readonly TaskWeekday[]): string =>
  JSON.stringify(sortTaskWeekdays(days));

export const parseTaskRecurrenceDays = (value?: string | null): TaskWeekday[] => {
  if (!value) {
    return [];
  }

  try {
    return normalizeTaskWeekdays(JSON.parse(value));
  } catch {
    return [];
  }
};

export const getTaskWeekdayLabel = (day: TaskWeekday): string => TASK_WEEKDAY_LABELS[day];

export const formatTaskRecurrenceDays = (days: readonly TaskWeekday[]): string =>
  sortTaskWeekdays(days).map(getTaskWeekdayLabel).join(', ');

export const getTaskWeekdayFromDateKey = (dateKey: string): TaskWeekday =>
  parseDateKey(dateKey).getDay() as TaskWeekday;

export const getDefaultTaskRecurrenceDays = (dateKey: string): TaskWeekday[] => [
  getTaskWeekdayFromDateKey(dateKey),
];

export const isTaskRecurring = (
  task: Pick<Task, 'recurrenceType' | 'recurrenceDays'>,
): boolean =>
  task.recurrenceType === WEEKLY_RECURRENCE_TYPE && task.recurrenceDays.length > 0;

export const getTaskOccurrenceCompletionKey = (
  taskId: string,
  dateKey: string,
): string => `${taskId}:${dateKey}`;

export const buildTaskOccurrenceCompletionLookup = (
  completions: TaskOccurrenceCompletion[],
): Map<string, TaskOccurrenceCompletion> =>
  new Map(
    completions.map((completion) => [
      getTaskOccurrenceCompletionKey(completion.taskId, completion.date),
      completion,
    ]),
  );

export const doesTaskOccurOnDate = (task: Task, dateKey: string): boolean => {
  if (isTaskRecurring(task)) {
    if (!task.date || task.date.localeCompare(dateKey) > 0) {
      return false;
    }

    return task.recurrenceDays.includes(getTaskWeekdayFromDateKey(dateKey));
  }

  return task.date === dateKey;
};

const compareResolvedTaskOccurrences = (
  left: ResolvedTaskOccurrence,
  right: ResolvedTaskOccurrence,
): number => {
  if (left.isCompleted !== right.isCompleted) {
    return Number(left.isCompleted) - Number(right.isCompleted);
  }

  const leftDate = left.task.date ?? '9999-99-99';
  const rightDate = right.task.date ?? '9999-99-99';
  if (leftDate !== rightDate) {
    return leftDate.localeCompare(rightDate);
  }

  return left.task.title.localeCompare(right.task.title, 'de-DE');
};

export const buildResolvedTaskOccurrence = (
  task: Task,
  dateKey: string,
  completionLookup: Map<string, TaskOccurrenceCompletion>,
): ResolvedTaskOccurrence => {
  const completion = completionLookup.get(getTaskOccurrenceCompletionKey(task.id, dateKey));

  return {
    key: `${task.id}:${dateKey}`,
    task,
    occurrenceDate: dateKey,
    isCompleted: Boolean(completion),
    completedAt: completion?.completedAt ?? null,
  };
};

export const getResolvedTaskOccurrencesForDate = (
  tasks: Task[],
  dateKey: string,
  completionLookup: Map<string, TaskOccurrenceCompletion>,
): ResolvedTaskOccurrence[] =>
  tasks
    .filter((task) => doesTaskOccurOnDate(task, dateKey))
    .map((task) => buildResolvedTaskOccurrence(task, dateKey, completionLookup))
    .sort(compareResolvedTaskOccurrences);

export const getResolvedTaskOccurrencesInRange = (
  tasks: Task[],
  startDateKey: string,
  endDateKey: string,
  completionLookup: Map<string, TaskOccurrenceCompletion>,
): ResolvedTaskOccurrence[] => {
  const occurrences: ResolvedTaskOccurrence[] = [];

  for (const task of tasks) {
    if (isTaskRecurring(task)) {
      const firstDate = task.date && task.date.localeCompare(startDateKey) > 0
        ? task.date
        : startDateKey;

      for (
        let currentDate = firstDate;
        currentDate.localeCompare(endDateKey) <= 0;
        currentDate = formatDateKey(addDays(currentDate, 1))
      ) {
        if (!doesTaskOccurOnDate(task, currentDate)) {
          continue;
        }

        occurrences.push(buildResolvedTaskOccurrence(task, currentDate, completionLookup));
      }

      continue;
    }

    if (!task.date) {
      continue;
    }

    if (task.date.localeCompare(startDateKey) < 0 || task.date.localeCompare(endDateKey) > 0) {
      continue;
    }

    occurrences.push(buildResolvedTaskOccurrence(task, task.date, completionLookup));
  }

  return occurrences.sort(compareResolvedTaskOccurrences);
};

export const getTaskScheduleLabel = (task: Task): string | null => {
  if (isTaskRecurring(task)) {
    return `Wiederholend - ${formatTaskRecurrenceDays(task.recurrenceDays)}`;
  }

  return task.date;
};
