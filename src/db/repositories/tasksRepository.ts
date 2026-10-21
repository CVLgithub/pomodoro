import { GENERAL_TAG_ID } from '../../constants/config';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import {
  isTaskRecurring,
  normalizeTaskRecurrence,
  parseTaskRecurrenceDays,
  serializeTaskRecurrenceDays,
} from '../../utils/taskRecurrence';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';
import { deleteTaskOccurrenceCompletionsByTaskId } from './taskOccurrenceCompletionsRepository';

type TaskRow = {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: number;
  completedAt: string | null;
  recurrenceType: string;
  recurrenceDays: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  deletedAt: string | null;
};

const mapTaskRow = (row: TaskRow): Task => {
  const recurrence = normalizeTaskRecurrence(
    row.recurrenceType,
    parseTaskRecurrenceDays(row.recurrenceDays),
  );

  return {
    id: row.id,
    title: row.title,
    date: row.date,
    tagId: row.tagId,
    isCompleted: Boolean(row.isCompleted),
    completedAt: row.completedAt,
    recurrenceType: recurrence.recurrenceType,
    recurrenceDays: recurrence.recurrenceDays,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    isDeleted: Boolean(row.isDeleted),
    deletedAt: row.deletedAt,
  };
};

export const listTasks = async (): Promise<Task[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, completedAt, recurrenceType, recurrenceDays, createdAt, updatedAt, isDeleted, deletedAt
      FROM tasks
      WHERE isDeleted = 0
      ORDER BY isCompleted ASC, date IS NULL ASC, date ASC, updatedAt DESC;
    `,
  );

  return rows.map(mapTaskRow);
};

export const getTaskById = async (id: string): Promise<Task | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, completedAt, recurrenceType, recurrenceDays, createdAt, updatedAt, isDeleted, deletedAt
      FROM tasks
      WHERE id = ? AND isDeleted = 0;
    `,
    id,
  );

  return row ? mapTaskRow(row) : null;
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const recurrence = normalizeTaskRecurrence(
    input.recurrenceType,
    input.recurrenceDays,
  );
  const task: Task = {
    id: createUuid(),
    title: input.title.trim(),
    date: input.date ?? null,
    tagId: input.tagId ?? GENERAL_TAG_ID,
    isCompleted: false,
    completedAt: recurrence.recurrenceType === 'weekly' ? null : input.completedAt ?? null,
    recurrenceType: recurrence.recurrenceType,
    recurrenceDays: recurrence.recurrenceDays,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  await db.runAsync(
    `
      INSERT INTO tasks (
        id, title, date, tagId, isCompleted, completedAt, recurrenceType, recurrenceDays, createdAt, updatedAt, isDeleted, deletedAt
      )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL);
    `,
    task.id,
    task.title,
    task.date,
    task.tagId,
    task.isCompleted ? 1 : 0,
    task.completedAt,
    task.recurrenceType,
    serializeTaskRecurrenceDays(task.recurrenceDays),
    task.createdAt,
    task.updatedAt,
  );

  return task;
};

export const updateTask = async (
  id: string,
  input: UpdateTaskInput,
): Promise<Task> => {
  const db = await getDatabase();
  const existingTask = await getTaskById(id);

  if (!existingTask) {
    throw new Error('Task not found');
  }

  const nextRecurrence = normalizeTaskRecurrence(
    input.recurrenceType ?? existingTask.recurrenceType,
    input.recurrenceDays ?? existingTask.recurrenceDays,
  );
  const nextDate = input.date !== undefined ? input.date : existingTask.date;
  const shouldTreatAsRecurring = nextRecurrence.recurrenceType === 'weekly';
  const updatedTask: Task = {
    ...existingTask,
    title: input.title?.trim() ?? existingTask.title,
    date: nextDate,
    tagId: input.tagId ?? existingTask.tagId,
    isCompleted: shouldTreatAsRecurring
      ? false
      : input.isCompleted ?? existingTask.isCompleted,
    completedAt:
      shouldTreatAsRecurring
        ? null
        : input.completedAt !== undefined
        ? input.completedAt
        : input.isCompleted === undefined || input.isCompleted === existingTask.isCompleted
          ? existingTask.completedAt
          : input.isCompleted
            ? toLocalIsoString()
            : null,
    recurrenceType: nextRecurrence.recurrenceType,
    recurrenceDays: nextRecurrence.recurrenceDays,
    updatedAt: toLocalIsoString(),
    isDeleted: false,
    deletedAt: null,
  };

  const recurrenceSettingsChanged =
    existingTask.recurrenceType !== updatedTask.recurrenceType ||
    JSON.stringify(existingTask.recurrenceDays) !== JSON.stringify(updatedTask.recurrenceDays) ||
    (updatedTask.date !== existingTask.date &&
      (isTaskRecurring(existingTask) || isTaskRecurring(updatedTask)));

  await db.runAsync(
    `
      UPDATE tasks
      SET
        title = ?,
        date = ?,
        tagId = ?,
        isCompleted = ?,
        completedAt = ?,
        recurrenceType = ?,
        recurrenceDays = ?,
        updatedAt = ?, isDeleted = 0, deletedAt = NULL
      WHERE id = ?;
    `,
    updatedTask.title,
    updatedTask.date,
    updatedTask.tagId,
    updatedTask.isCompleted ? 1 : 0,
    updatedTask.completedAt,
    updatedTask.recurrenceType,
    serializeTaskRecurrenceDays(updatedTask.recurrenceDays),
    updatedTask.updatedAt,
    id,
  );

  if (recurrenceSettingsChanged) {
    await deleteTaskOccurrenceCompletionsByTaskId(id);
  }

  return updatedTask;
};

export interface DeleteTaskResult {
  affectedSessionIds: string[];
}

export const deleteTask = async (id: string): Promise<DeleteTaskResult> => {
  const db = await getDatabase();
  const sessionRows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sessions WHERE taskId = ?;',
    id,
  );
  const now = toLocalIsoString();
  await db.runAsync(
    'UPDATE tasks SET isDeleted = 1, deletedAt = ?, updatedAt = ? WHERE id = ?;',
    now,
    now,
    id,
  );
  return {
    affectedSessionIds: sessionRows.map((row) => row.id),
  };
};

export const getTasksByDate = async (dateKey: string): Promise<Task[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, completedAt, recurrenceType, recurrenceDays, createdAt, updatedAt, isDeleted, deletedAt
      FROM tasks
      WHERE date = ? AND isDeleted = 0
      ORDER BY isCompleted ASC, updatedAt DESC;
    `,
    dateKey,
  );

  return rows.map(mapTaskRow);
};
