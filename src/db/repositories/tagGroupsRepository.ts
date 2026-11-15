import { GENERAL_TAG_GROUP_ID, GENERAL_TAG_GROUP_NAME } from '../../constants/config';
import { TagGroup } from '../../types/tagGroup';
import { toLocalIsoString } from '../../utils/date';
import { isSameTagName } from '../../utils/tagGroups';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type TagGroupRow = {
  id: string;
  name: string;
  isCompleted: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: number;
  deletedAt: string | null;
};

const mapTagGroupRow = (row: TagGroupRow): TagGroup => ({
  ...row,
  isCompleted: Boolean(row.isCompleted),
  isDeleted: Boolean(row.isDeleted),
});

export const listTagGroups = async (): Promise<TagGroup[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<TagGroupRow>(
    `SELECT id, name, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt
     FROM tag_groups
     WHERE isDeleted = 0
     ORDER BY isCompleted ASC, name COLLATE NOCASE ASC;`,
  );
  return rows.map(mapTagGroupRow);
};

export const createTagGroup = async (name: string): Promise<TagGroup> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const group: TagGroup = {
    id: createUuid(),
    name: name.trim(),
    isCompleted: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
    deletedAt: null,
  };
  await db.runAsync(
    `INSERT INTO tag_groups (id, name, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt)
     VALUES (?, ?, 0, NULL, ?, ?, 0, NULL);`,
    group.id,
    group.name,
    group.createdAt,
    group.updatedAt,
  );
  return group;
};

export const setTagGroupCompleted = async (
  id: string,
  isCompleted: boolean,
): Promise<{ group: TagGroup; updatedTagIds: string[] }> => {
  if (id === GENERAL_TAG_GROUP_ID) {
    throw new Error(`${GENERAL_TAG_GROUP_NAME} cannot be completed`);
  }

  const db = await getDatabase();
  const existing = await getTagGroupById(id);
  if (!existing) {
    throw new Error('Tag-Gruppe nicht gefunden');
  }

  const now = toLocalIsoString();
  const completedAt = isCompleted ? (existing.completedAt ?? now) : null;
  const affectedTags = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM tags WHERE groupId = ? AND isDeleted = 0 AND isCompleted != ?;',
    id,
    isCompleted ? 1 : 0,
  );

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');
  try {
    await db.runAsync(
      'UPDATE tag_groups SET isCompleted = ?, completedAt = ?, updatedAt = ?, isDeleted = 0, deletedAt = NULL WHERE id = ?;',
      isCompleted ? 1 : 0,
      completedAt,
      now,
      id,
    );
    await db.runAsync(
      'UPDATE tags SET isCompleted = ?, completedAt = ?, updatedAt = ? WHERE groupId = ? AND isDeleted = 0 AND isCompleted != ?;',
      isCompleted ? 1 : 0,
      isCompleted ? now : null,
      now,
      id,
      isCompleted ? 1 : 0,
    );
    await db.execAsync('COMMIT;');
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }

  return {
    group: {
      ...existing,
      isCompleted,
      completedAt,
      updatedAt: now,
    },
    updatedTagIds: affectedTags.map((tag) => tag.id),
  };
};

export const deleteTagGroup = async (id: string): Promise<string[]> => {
  if (id === GENERAL_TAG_GROUP_ID) {
    throw new Error(`${GENERAL_TAG_GROUP_NAME} cannot be deleted`);
  }
  const db = await getDatabase();
  const now = toLocalIsoString();
  const affected = await db.getAllAsync<{ id: string; name: string }>(
    'SELECT id, name FROM tags WHERE groupId = ? AND isDeleted = 0;',
    id,
  );
  if (affected.length > 0) {
    const generalTags = await db.getAllAsync<{ id: string; name: string }>(
      'SELECT id, name FROM tags WHERE COALESCE(groupId, ?) = ? AND isDeleted = 0;',
      GENERAL_TAG_GROUP_ID,
      GENERAL_TAG_GROUP_ID,
    );
    const conflictingTag = affected.find((tag) =>
      generalTags.some((generalTag) => isSameTagName(generalTag.name, tag.name)),
    );
    if (conflictingTag) {
      throw new Error(
        `In „${GENERAL_TAG_GROUP_NAME}“ existiert bereits ein Tag mit dem Namen „${conflictingTag.name}“.`,
      );
    }
  }
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
    `SELECT id, name, isCompleted, completedAt, createdAt, updatedAt, isDeleted, deletedAt
     FROM tag_groups WHERE id = ? AND isDeleted = 0;`,
    id,
  );
  return row ? mapTagGroupRow(row) : null;
};
