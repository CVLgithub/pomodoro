import { Platform } from 'react-native';

import { GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { EntriesResponse } from '../../types/api';
import { toLocalIsoString } from '../../utils/date';
import { getDatabase } from '../../db/client';
import { fetchEntries } from '../api/entriesService';

const TIME_ONLY_PATTERN = /^\d{2}:\d{2}(?::\d{2})?$/;
const TEMP_TAG_NAME_PREFIX = '__downsync_tag__';

type NormalizedEntries = EntriesResponse;

const isGeneralTagName = (value: string): boolean =>
  value.trim().localeCompare(GENERAL_TAG_NAME, 'de-DE', { sensitivity: 'accent' }) === 0;

const toSessionDateTime = (dateKey: string, timeValue: string): string => {
  if (timeValue.includes('T')) {
    return timeValue;
  }

  if (!TIME_ONLY_PATTERN.test(timeValue)) {
    return timeValue;
  }

  const normalizedTime = timeValue.length === 5 ? `${timeValue}:00` : timeValue;
  return toLocalIsoString(new Date(`${dateKey}T${normalizedTime}`));
};

const normalizeEntries = (entries: EntriesResponse): NormalizedEntries => {
  const tagIdMap = new Map<string, string>();
  const normalizedTagsMap = new Map<string, EntriesResponse['tags'][number]>();

  for (const tag of entries.tags) {
    const normalizedId = isGeneralTagName(tag.name) ? GENERAL_TAG_ID : tag.id;
    const normalizedTag = {
      ...tag,
      id: normalizedId,
      name: normalizedId === GENERAL_TAG_ID ? GENERAL_TAG_NAME : tag.name.trim(),
    };

    tagIdMap.set(tag.id, normalizedId);

    const existingTag = normalizedTagsMap.get(normalizedId);
    if (!existingTag || existingTag.updatedAt.localeCompare(normalizedTag.updatedAt) < 0) {
      normalizedTagsMap.set(normalizedId, normalizedTag);
    }
  }

  return {
    tags: Array.from(normalizedTagsMap.values()),
    tasks: entries.tasks.map((task) => ({
      ...task,
      tagId: tagIdMap.get(task.tagId) ?? task.tagId,
    })),
    sessions: entries.sessions.map((session) => ({
      ...session,
      tagId: tagIdMap.get(session.tagId) ?? session.tagId,
    })),
  };
};

const getConflictingTagIdByName = async (
  db: Awaited<ReturnType<typeof getDatabase>>,
  name: string,
  id: string,
): Promise<string | null> => {
  const row = await db.getFirstAsync<{ id: string }>(
    `
      SELECT id
      FROM tags
      WHERE id != ? AND name = ? COLLATE NOCASE
      LIMIT 1;
    `,
    id,
    name,
  );

  return row?.id ?? null;
};

const adoptTagNameConflict = async (
  db: Awaited<ReturnType<typeof getDatabase>>,
  incomingTag: EntriesResponse['tags'][number],
): Promise<void> => {
  const conflictingTagId = await getConflictingTagIdByName(db, incomingTag.name, incomingTag.id);

  if (!conflictingTagId) {
    return;
  }

  const temporaryName = `${TEMP_TAG_NAME_PREFIX}${conflictingTagId}`;

  await db.runAsync(
    `
      UPDATE tags
      SET name = ?, updatedAt = ?
      WHERE id = ?;
    `,
    temporaryName,
    incomingTag.updatedAt,
    conflictingTagId,
  );

  await db.runAsync(
    `
      INSERT INTO tags (id, name, color, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        color = excluded.color,
        createdAt = excluded.createdAt,
        updatedAt = excluded.updatedAt;
    `,
    incomingTag.id,
    incomingTag.name,
    incomingTag.color,
    incomingTag.createdAt,
    incomingTag.updatedAt,
  );

  await db.runAsync(
    `
      UPDATE tasks
      SET tagId = ?, updatedAt = ?
      WHERE tagId = ?;
    `,
    incomingTag.id,
    incomingTag.updatedAt,
    conflictingTagId,
  );

  await db.runAsync(
    `
      UPDATE sessions
      SET tagId = ?, syncStatus = 'synced'
      WHERE tagId = ?;
    `,
    incomingTag.id,
    conflictingTagId,
  );

  await db.runAsync(
    `
      UPDATE timer_state
      SET selectedTagId = ?, updatedAt = ?
      WHERE selectedTagId = ?;
    `,
    incomingTag.id,
    incomingTag.updatedAt,
    conflictingTagId,
  );

  await db.runAsync(
    `
      DELETE FROM sync_queue
      WHERE entityType = 'tag' AND entityId = ?;
    `,
    conflictingTagId,
  );

  await db.runAsync('DELETE FROM tags WHERE id = ?;', conflictingTagId);
};

const upsertEntries = async (entries: EntriesResponse): Promise<void> => {
  const normalizedEntries = normalizeEntries(entries);
  const db = await getDatabase();

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    for (const tag of normalizedEntries.tags) {
      await adoptTagNameConflict(db, tag);
      await db.runAsync(
        `
          INSERT INTO tags (id, name, color, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt;
        `,
        tag.id,
        tag.name,
        tag.color,
        tag.createdAt,
        tag.updatedAt,
      );
    }

    for (const task of normalizedEntries.tasks) {
      await db.runAsync(
        `
          INSERT INTO tasks (id, title, date, tagId, isCompleted, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            date = excluded.date,
            tagId = excluded.tagId,
            isCompleted = excluded.isCompleted,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt;
        `,
        task.id,
        task.title,
        task.date,
        task.tagId,
        task.isCompleted ? 1 : 0,
        task.createdAt,
        task.updatedAt,
      );
    }

    for (const session of normalizedEntries.sessions) {
      const startTime = toSessionDateTime(session.date, session.startTime);
      const endTime = toSessionDateTime(session.date, session.endTime);
      const createdAt = endTime.includes('T') ? endTime : toLocalIsoString();

      await db.runAsync(
        `
          INSERT INTO sessions (
            id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            date = excluded.date,
            startTime = excluded.startTime,
            endTime = excluded.endTime,
            durationMinutes = excluded.durationMinutes,
            taskId = excluded.taskId,
            tagId = excluded.tagId,
            syncStatus = excluded.syncStatus,
            createdAt = excluded.createdAt;
        `,
        session.id,
        session.title,
        session.date,
        startTime,
        endTime,
        session.durationMinutes,
        session.taskId,
        session.tagId,
        'synced',
        createdAt,
      );
    }

    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};

export const downsyncEntries = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    return;
  }

  const entries = await fetchEntries();
  await upsertEntries(entries);
};
