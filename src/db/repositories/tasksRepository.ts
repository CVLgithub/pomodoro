import { GENERAL_TAG_ID } from '../../constants/config';
import { Task, CreateTaskInput, UpdateTaskInput } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TaskRow = {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: number;
  createdAt: string;
  updatedAt: string;
};

const mapTaskRow = (row: TaskRow): Task => ({
  id: row.id,
  title: row.title,
  date: row.date,
  tagId: row.tagId,
  isCompleted: Boolean(row.isCompleted),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listTasks = async (): Promise<Task[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, createdAt, updatedAt
      FROM tasks
      ORDER BY isCompleted ASC, date IS NULL ASC, date ASC, updatedAt DESC;
    `,
  );

  return rows.map(mapTaskRow);
};

export const getTaskById = async (id: string): Promise<Task | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, createdAt, updatedAt
      FROM tasks
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapTaskRow(row) : null;
};

export const createTask = async (input: CreateTaskInput): Promise<Task> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const task: Task = {
    id: createUuid(),
    title: input.title.trim(),
    date: input.date ?? null,
    tagId: input.tagId ?? GENERAL_TAG_ID,
    isCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `
      INSERT INTO tasks (id, title, date, tagId, isCompleted, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    task.id,
    task.title,
    task.date,
    task.tagId,
    task.isCompleted ? 1 : 0,
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

  const updatedTask: Task = {
    ...existingTask,
    title: input.title?.trim() ?? existingTask.title,
    date: input.date !== undefined ? input.date : existingTask.date,
    tagId: input.tagId ?? existingTask.tagId,
    isCompleted: input.isCompleted ?? existingTask.isCompleted,
    updatedAt: toLocalIsoString(),
  };

  await db.runAsync(
    `
      UPDATE tasks
      SET title = ?, date = ?, tagId = ?, isCompleted = ?, updatedAt = ?
      WHERE id = ?;
    `,
    updatedTask.title,
    updatedTask.date,
    updatedTask.tagId,
    updatedTask.isCompleted ? 1 : 0,
    updatedTask.updatedAt,
    id,
  );

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
  await db.runAsync('DELETE FROM tasks WHERE id = ?;', id);
  return {
    affectedSessionIds: sessionRows.map((row) => row.id),
  };
};

export const getTasksByDate = async (dateKey: string): Promise<Task[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskRow>(
    `
      SELECT id, title, date, tagId, isCompleted, createdAt, updatedAt
      FROM tasks
      WHERE date = ?
      ORDER BY isCompleted ASC, updatedAt DESC;
    `,
    dateKey,
  );

  return rows.map(mapTaskRow);
};
