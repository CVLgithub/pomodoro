import { GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { Tag, CreateTagInput, UpdateTagInput } from '../../types/tag';
import { toLocalIsoString } from '../../utils/date';
import { normalizeCustomTagGroupName } from '../../utils/tagGroups';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TagRow = {
  id: string;
  name: string;
  color: string;
  groupName: string | null;
  createdAt: string;
  updatedAt: string;
};

const mapTagRow = (row: TagRow): Tag => ({
  id: row.id,
  name: row.name,
  color: row.color,
  groupName: normalizeCustomTagGroupName(row.groupName),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const listTags = async (): Promise<Tag[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagRow>(
    `
      SELECT id, name, color, groupName, createdAt, updatedAt
      FROM tags
      ORDER BY CASE WHEN id = '${GENERAL_TAG_ID}' THEN 0 ELSE 1 END, name COLLATE NOCASE ASC;
    `,
  );

  return rows.map(mapTagRow);
};

export const getTagById = async (id: string): Promise<Tag | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TagRow>(
    `
      SELECT id, name, color, groupName, createdAt, updatedAt
      FROM tags
      WHERE id = ?;
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
    groupName: normalizeCustomTagGroupName(input.groupName),
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `
      INSERT INTO tags (id, name, color, groupName, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?);
    `,
    tag.id,
    tag.name,
    tag.color,
    tag.groupName,
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
    groupName:
      input.groupName !== undefined
        ? normalizeCustomTagGroupName(input.groupName)
        : existingTag.groupName,
    updatedAt: toLocalIsoString(),
  };

  await db.runAsync(
    `
      UPDATE tags
      SET name = ?, color = ?, groupName = ?, updatedAt = ?
      WHERE id = ?;
    `,
    updatedTag.name,
    updatedTag.color,
    updatedTag.groupName,
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
    'SELECT id FROM tasks WHERE tagId = ?;',
    id,
  );
  const sessionRows = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM sessions WHERE tagId = ?;',
    id,
  );

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    await db.runAsync(
      'UPDATE tasks SET tagId = ?, updatedAt = ? WHERE tagId = ?;',
      GENERAL_TAG_ID,
      now,
      id,
    );
    await db.runAsync(
      "UPDATE sessions SET tagId = ?, syncStatus = 'pending' WHERE tagId = ?;",
      GENERAL_TAG_ID,
      id,
    );
    await db.runAsync('DELETE FROM tags WHERE id = ?;', id);
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
