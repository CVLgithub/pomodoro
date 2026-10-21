import { GENERAL_TAG_GROUP_ID, GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { Tag, CreateTagInput, UpdateTagInput } from '../../types/tag';
import { toLocalIsoString } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TagRow = {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
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
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  isDeleted: Boolean(row.isDeleted),
  deletedAt: row.deletedAt,
});

export const listTags = async (): Promise<Tag[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `
      SELECT id, name, color, groupId, createdAt, updatedAt, isDeleted, deletedAt
      FROM tags
      WHERE isDeleted = 0
      ORDER BY CASE WHEN id = '${GENERAL_TAG_ID}' THEN 0 ELSE 1 END, name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapTagRow);
};

export const getTagById = async (id: string): Promise<Tag | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TagRow>(
    `
      SELECT id, name, color, groupId, createdAt, updatedAt, isDeleted, deletedAt
      FROM tags
      WHERE id = ? AND isDeleted = 0;
    `,
    id,
  );

  return row ? mapTagRow(row) : null;
};

export const createTag = async (input: CreateTagInput): Promise<Tag> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const tag: Tag = {
    id: createUuid(),
    name: input.name.trim(),
    color: input.color,
    groupId: input.groupId ?? GENERAL_TAG_GROUP_ID,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };

  await db.runAsync(
    `
      INSERT INTO tags (id, name, color, groupId, createdAt, updatedAt, isDeleted, deletedAt)
      VALUES (?, ?, ?, ?, ?, ?, 0, NULL);
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
    throw new Error('Tag not found');
  }

  const updatedTag: Tag = {
    ...existingTag,
    name: input.name?.trim() ?? existingTag.name,
    color: input.color ?? existingTag.color,
    groupId: input.groupId !== undefined ? input.groupId : existingTag.groupId,
    updatedAt: toLocalIsoString(),
  };

  await db.runAsync(
    `
      UPDATE tags
      SET name = ?, color = ?, groupId = ?, updatedAt = ?, isDeleted = 0, deletedAt = NULL
      WHERE id = ?;
    `,
    updatedTag.name,
    updatedTag.color,
    updatedTag.groupId,
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
    throw new Error(`${GENERAL_TAG_NAME} cannot be deleted`);
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
