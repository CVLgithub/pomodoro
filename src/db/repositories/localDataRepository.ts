import {
  GENERAL_TAG_GROUP_ID,
  GENERAL_TAG_GROUP_NAME,
  GENERAL_TAG_ID,
  GENERAL_TAG_NAME,
} from '../../constants/config';
import { toLocalIsoString } from '../../utils/date';
import { getDatabase } from '../client';

export const getLocalDataSummary = async (): Promise<{ dataCount: number; queueCount: number }> => {
  const db = await getDatabase();
  const [data, queue] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT
         (SELECT COUNT(*) FROM tags WHERE id != ?) +
         (SELECT COUNT(*) FROM tasks) +
         (SELECT COUNT(*) FROM sessions) +
         (SELECT COUNT(*) FROM tag_groups WHERE id != ?) AS count;`,
      GENERAL_TAG_ID,
      GENERAL_TAG_GROUP_ID,
    ),
    db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sync_queue WHERE status != 'synced';",
    ),
  ]);
  return { dataCount: data?.count ?? 0, queueCount: queue?.count ?? 0 };
};

export const clearLocalDataAndQueue = async (): Promise<void> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync('DELETE FROM sync_queue;');
    await transaction.runAsync('DELETE FROM task_occurrence_completions;');
    await transaction.runAsync('DELETE FROM sessions;');
    await transaction.runAsync('DELETE FROM tasks;');
    await transaction.runAsync('DELETE FROM tags WHERE id != ?;', GENERAL_TAG_ID);
    await transaction.runAsync('DELETE FROM tag_groups WHERE id != ?;', GENERAL_TAG_GROUP_ID);
    await transaction.runAsync(
      `INSERT OR IGNORE INTO tag_groups (id, name, createdAt, updatedAt, isDeleted, deletedAt)
       VALUES (?, ?, ?, ?, 0, NULL);`,
      GENERAL_TAG_GROUP_ID,
      GENERAL_TAG_GROUP_NAME,
      now,
      now,
    );
    await transaction.runAsync(
      `INSERT OR IGNORE INTO tags (id, name, color, groupId, groupName, createdAt, updatedAt, isDeleted, deletedAt)
       VALUES (?, ?, '#5EA2FF', ?, NULL, ?, ?, 0, NULL);`,
      GENERAL_TAG_ID,
      GENERAL_TAG_NAME,
      GENERAL_TAG_GROUP_ID,
      now,
      now,
    );
    await transaction.runAsync(
      'UPDATE tag_groups SET name = ?, updatedAt = ?, isDeleted = 0, deletedAt = NULL WHERE id = ?;',
      GENERAL_TAG_GROUP_NAME,
      now,
      GENERAL_TAG_GROUP_ID,
    );
    await transaction.runAsync(
      'UPDATE tags SET name = ?, color = ?, groupId = ?, updatedAt = ?, isDeleted = 0, deletedAt = NULL WHERE id = ?;',
      GENERAL_TAG_NAME,
      '#5EA2FF',
      GENERAL_TAG_GROUP_ID,
      now,
      GENERAL_TAG_ID,
    );
    await transaction.runAsync(
      'UPDATE timer_state SET selectedTaskId = NULL, selectedTagId = ?, updatedAt = ? WHERE id = ?;',
      GENERAL_TAG_ID,
      now,
      'default',
    );
  });
};
