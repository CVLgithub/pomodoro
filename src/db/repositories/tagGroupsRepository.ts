import { GENERAL_TAG_GROUP_ID, GENERAL_TAG_GROUP_NAME } from '../../constants/config';
import { TagGroup } from '../../types/tagGroup';
import { toLocalIsoString } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TagGroupRow = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  deletedAt: string | null;
};

const mapTagGroupRow = (row: TagGroupRow): TagGroup => ({
  ...row,
  isDeleted: Boolean(row.isDeleted),
});

export const listTagGroups = async (): Promise<TagGroup[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagGroupRow>(
    `SELECT id, name, createdAt, updatedAt, isDeleted, deletedAt
     FROM tag_groups
     WHERE isDeleted = 0
     ORDER BY name COLLATE NOCASE ASC;`,
  );
  return rows.map(mapTagGroupRow);
};

export const createTagGroup = async (name: string): Promise<TagGroup> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const group: TagGroup = {
    id: createUuid(),
    name: name.trim(),
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO tag_groups (id, name, createdAt, updatedAt, isDeleted, deletedAt)
     VALUES (?, ?, ?, ?, 0, NULL);`,
    group.id,
    group.name,
    group.createdAt,
    group.updatedAt,
  );
  return group;
};

export const deleteTagGroup = async (id: string): Promise<string[]> => {
  if (id === GENERAL_TAG_GROUP_ID) {
    throw new Error(`${GENERAL_TAG_GROUP_NAME} cannot be deleted`);
  }
  const db = await getDatabase();
  const now = toLocalIsoString();
  const affected = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM tags WHERE groupId = ? AND isDeleted = 0;',
    id,
  );
  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      'UPDATE tags SET groupId = ?, groupName = NULL, updatedAt = ? WHERE groupId = ? AND isDeleted = 0;',
      GENERAL_TAG_GROUP_ID,
      now,
      id,
    );
    await db.runAsync(
      'UPDATE tag_groups SET isDeleted = 1, deletedAt = ?, updatedAt = ? WHERE id = ?;',
      now,
      now,
      id,
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
  return affected.map((tag) => tag.id);
};

export const getTagGroupById = async (id: string): Promise<TagGroup | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TagGroupRow>(
    `SELECT id, name, createdAt, updatedAt, isDeleted, deletedAt
     FROM tag_groups WHERE id = ? AND isDeleted = 0;`,
    id,
  );
  return row ? mapTagGroupRow(row) : null;
};
