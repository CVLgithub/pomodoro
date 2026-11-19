import { GENERAL_TAG_GROUP_ID, GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { Tag, CreateTagInput, UpdateTagInput } from '../../types/tag';
import { toLocalIsoString } from '../../utils/date';
import { hasDuplicateTagNameInGroup } from '../../utils/tagGroups';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TagRow = {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  isCompleted: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  deletedAt: string | null;
};

const mapTagRow = (row: TagRow): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  groupId: row.groupId,
  isCompleted: Boolean(row.isCompleted),
  completedAt: row.completedAt,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  isDeleted: Boolean(row.isDeleted),
  deletedAt: row.deletedAt,
});

export const listTags = async (): Promise<Tag[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `
      SELECT id, name, color, groupId, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt
      FROM tags
      WHERE isDeleted = 0
      ORDER BY CASE WHEN id = '${GENERAL_TAG_ID}' THEN 0 ELSE 1 END, isCompleted ASC, name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapTagRow);
};

export const getTagById = async (id: string): Promise<Tag | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TagRow>(
    `
      SELECT id, name, color, groupId, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt
      FROM tags
      WHERE id = ? AND isDeleted = 0;
    `,
    id,
  );

  return row ? mapTagRow(row) : null;
};

const assertUniqueTagNameInGroup = async (
  name: string,
  groupId: string | null | undefined,
  excludeTagId?: string,
): Promise<void> => {
  const existingTags = await listTags();
  if (hasDuplicateTagNameInGroup(existingTags, name, groupId, excludeTagId)) {
    throw new Error('In diesem Projekt existiert bereits ein Tag mit diesem Namen');
  }
};

export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const tag: Tag = {
    id: createUuid(),
    name: input.name.trim(),
    color: input.color,
    groupId: input.groupId ?? GENERAL_TAG_GROUP_ID,
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  await assertUniqueTagNameInGroup(tag.name, tag.groupId);

  await db.runAsync(
    `
      INSERT INTO tags (id, name, color, groupId, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt)
      VALUES (?, ?, ?, ?, 0, NULL, ?, ?, 0, NULL);
    `,
    tag.id,
    tag.name,
    tag.color,
    tag.groupId,
    tag.createdAt,
    tag.updatedAt,
  );

  return tag;
};

export const updateTag = async (id: string, input: UpdateTagInput): Promise<Tag> => {
  const db = await getDatabase();
  const existingTag = await getTagById(id);

  if (!existingTag) {
    throw new Error('Der Tag wurde nicht gefunden.');
  }

  const now = toLocalIsoString();
  const isGeneral = id === GENERAL_TAG_ID;
  const nextIsCompleted = isGeneral ? false : (input.isCompleted ?? existingTag.isCompleted);
  const nextCompletedAt = isGeneral
    ? null
    : input.completedAt !== undefined
      ? input.completedAt
      : input.isCompleted === undefined || input.isCompleted === existingTag.isCompleted
        ? existingTag.completedAt
        : nextIsCompleted
          ? now
          : null;

  const updatedTag: Tag = {
    ...existingTag,
    name: isGeneral ? existingTag.name : (input.name?.trim() ?? existingTag.name),
    color: input.color ?? existingTag.color,
    groupId: isGeneral
      ? existingTag.groupId
      : input.groupId !== undefined
        ? input.groupId
        : existingTag.groupId,
    isCompleted: nextIsCompleted,
    completedAt: nextCompletedAt,
    updatedAt: now,
  };

  await assertUniqueTagNameInGroup(updatedTag.name, updatedTag.groupId, updatedTag.id);

  await db.runAsync(
    `
      UPDATE tags
      SET name = ?, color = ?, groupId = ?, isCompleted = ?, completedAt = ?, updatedAt = ?, isDeleted = 0, deletedAt = NULL
      WHERE id = ?;
    `,
    updatedTag.name,
    updatedTag.color,
    updatedTag.groupId,
    updatedTag.isCompleted ? 1 : 0,
    updatedTag.completedAt,
    updatedTag.updatedAt,
    updatedTag.id,
  );

  return updatedTag;
};

export interface DeleteTagResult {
  reassignedTaskIds: string[];
  reassignedSessionIds: string[];
}

export const deleteTag = async (id: string): Promise<DeleteTagResult> => {
  if (id === GENERAL_TAG_ID) {
    throw new Error(`„${GENERAL_TAG_NAME}“ kann nicht gelöscht werden.`);
  }

  const db = await getDatabase();
  const now = toLocalIsoString();
  const taskRows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM tasks WHERE tagId = ? AND isDeleted = 0;',
    id,
  );
  const sessionRows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sessions WHERE tagId = ? AND isDeleted = 0;',
    id,
  );

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    await db.runAsync(
      'UPDATE tasks SET tagId = ?, updatedAt = ?, isDeleted = 0 WHERE tagId = ? AND isDeleted = 0;',
      GENERAL_TAG_ID,
      now,
      id,
    );
    await db.runAsync(
      "UPDATE sessions SET tagId = ?, updatedAt = ?, syncStatus = 'pending' WHERE tagId = ? AND isDeleted = 0;",
      GENERAL_TAG_ID,
      id,
    );
    await db.runAsync(
      'UPDATE tags SET isDeleted = 1, deletedAt = ?, updatedAt = ? WHERE id = ?;',
      now,
      now,
      id,
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  return {
    reassignedTaskIds: taskRows.map((row) => row.id),
    reassignedSessionIds: sessionRows.map((row) => row.id),
  };
};
