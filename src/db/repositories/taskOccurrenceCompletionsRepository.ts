import { TaskOccurrenceCompletion } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import { getDatabase } from '../client';

type TaskOccurrenceCompletionRow = TaskOccurrenceCompletion;

const mapRow = (
  row: TaskOccurrenceCompletionRow,
): TaskOccurrenceCompletion => row;

export const listTaskOccurrenceCompletions = async (): Promise<TaskOccurrenceCompletion[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TaskOccurrenceCompletionRow>(
    `
      SELECT taskId, date, completedAt, createdAt, updatedAt
      FROM task_occurrence_completions
      ORDER BY date ASC, updatedAt DESC;
    `,
  );

  return rows.map(mapRow);
};

export const setTaskOccurrenceCompletion = async (
  taskId: string,
  date: string,
  isCompleted: boolean,
): Promise<void> => {
  const db = await getDatabase();

  if (!isCompleted) {
    await db.runAsync(
      'DELETE FROM task_occurrence_completions WHERE taskId = ? AND date = ?;',
      taskId,
      date,
    );
    return;
  }

  const now = toLocalIsoString();
  await db.runAsync(
    `
      INSERT INTO task_occurrence_completions (taskId, date, completedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(taskId, date) DO UPDATE SET
        completedAt = excluded.completedAt,
        updatedAt = excluded.updatedAt;
    `,
    taskId,
    date,
    now,
    now,
    now,
  );
};

export const deleteTaskOccurrenceCompletionsByTaskId = async (
  taskId: string,
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM task_occurrence_completions WHERE taskId = ?;',
    taskId,
  );
};
