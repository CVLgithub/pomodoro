import { Platform } from 'react-native';

import { GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { getDatabase } from '../../db/client';
import { listSessions } from '../../db/repositories/sessionsRepository';
import { listTags } from '../../db/repositories/tagsRepository';
import { listTasks } from '../../db/repositories/tasksRepository';
import { EntriesResponse, EntriesSession, EntriesTag, EntriesTask } from '../../types/api';
import { Session } from '../../types/session';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import { fetchEntries } from '../api/entriesService';

const TIME_ONLY_PATTERN = /^\d{2}:\d{2}(?::\d{2})?$/;
const TEMP_TAG_NAME_PREFIX = '__downsync_tag__';

export type DownsyncEntityType = 'tag' | 'task' | 'session';

export interface DownsyncPreviewEntry {
  id: string;
  entityType: DownsyncEntityType;
  entityId: string;
  title: string;
  subtitle: string;
  detail: string;
  statusLabel: string;
  dependencyHint?: string;
}

type NormalizedEntries = EntriesResponse;

type LocalEntriesState = {
  tagsById: Map<string, Tag>;
  tasksById: Map<string, Task>;
  sessionsById: Map<string, Session>;
};

const DOWNYNC_TYPE_ORDER: Record<DownsyncEntityType, number> = {
  session: 0,
  tag: 1,
  task: 2,
};

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
      startTime: toSessionDateTime(session.date, session.startTime),
      endTime: toSessionDateTime(session.date, session.endTime),
    })),
  };
};

const fetchNormalizedEntries = async (): Promise<NormalizedEntries> =>
  normalizeEntries(await fetchEntries());

const loadLocalEntriesState = async (): Promise<LocalEntriesState> => {
  const [tags, tasks, sessions] = await Promise.all([
    listTags(),
    listTasks(),
    listSessions(),
  ]);

  return {
    tagsById: new Map(tags.map((tag) => [tag.id, tag])),
    tasksById: new Map(tasks.map((task) => [task.id, task])),
    sessionsById: new Map(sessions.map((session) => [session.id, session])),
  };
};

const matchesTag = (localTag: Tag | undefined, remoteTag: EntriesTag): boolean =>
  Boolean(
    localTag &&
      localTag.id === remoteTag.id &&
      localTag.name === remoteTag.name &&
      localTag.color === remoteTag.color &&
      localTag.createdAt === remoteTag.createdAt &&
      localTag.updatedAt === remoteTag.updatedAt,
  );

const matchesTask = (localTask: Task | undefined, remoteTask: EntriesTask): boolean =>
  Boolean(
    localTask &&
      localTask.id === remoteTask.id &&
      localTask.title === remoteTask.title &&
      localTask.date === remoteTask.date &&
      localTask.tagId === remoteTask.tagId &&
      localTask.isCompleted === remoteTask.isCompleted &&
      localTask.createdAt === remoteTask.createdAt &&
      localTask.updatedAt === remoteTask.updatedAt,
  );

const matchesSession = (
  localSession: Session | undefined,
  remoteSession: EntriesSession,
): boolean =>
  Boolean(
    localSession &&
      localSession.id === remoteSession.id &&
      localSession.title === remoteSession.title &&
      localSession.date === remoteSession.date &&
      localSession.startTime === remoteSession.startTime &&
      localSession.endTime === remoteSession.endTime &&
      localSession.durationMinutes === remoteSession.durationMinutes &&
      localSession.taskId === remoteSession.taskId &&
      localSession.tagId === remoteSession.tagId,
  );

const buildStatusLabel = (existsLocally: boolean): string =>
  existsLocally ? 'Server-Version weicht lokal ab' : 'Neu auf Server';

const buildDependencyHint = (dependencies: string[]): string | undefined => {
  if (dependencies.length === 0) {
    return undefined;
  }

  if (dependencies.length === 1) {
    return `Übernimmt auch ${dependencies[0]}.`;
  }

  const lastDependency = dependencies[dependencies.length - 1];
  const remainingDependencies = dependencies.slice(0, -1);
  return `Übernimmt auch ${remainingDependencies.join(', ')} und ${lastDependency}.`;
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

const applyEntries = async (entries: NormalizedEntries): Promise<void> => {
  const db = await getDatabase();
  const localState = await loadLocalEntriesState();
  const availableTagIds = new Set([
    GENERAL_TAG_ID,
    ...Array.from(localState.tagsById.keys()),
    ...entries.tags.map((tag) => tag.id),
  ]);
  const availableTaskIds = new Set([
    ...Array.from(localState.tasksById.keys()),
    ...entries.tasks.map((task) => task.id),
  ]);

  await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

  try {
    for (const tag of entries.tags) {
      await adoptTagNameConflict(db, tag);
      await db.runAsync(
        "DELETE FROM sync_queue WHERE entityType = 'tag' AND entityId = ? AND status != 'synced';",
        tag.id,
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
        tag.id,
        tag.name,
        tag.color,
        tag.createdAt,
        tag.updatedAt,
      );
    }

    for (const task of entries.tasks) {
      await db.runAsync(
        "DELETE FROM sync_queue WHERE entityType = 'task' AND entityId = ? AND status != 'synced';",
        task.id,
      );
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

    for (const session of entries.sessions) {
      const safeTaskId = session.taskId && availableTaskIds.has(session.taskId) ? session.taskId : null;
      const safeTagId = availableTagIds.has(session.tagId) ? session.tagId : GENERAL_TAG_ID;
      const createdAt = session.endTime.includes('T') ? session.endTime : toLocalIsoString();

      await db.runAsync(
        "DELETE FROM sync_queue WHERE entityType = 'session' AND entityId = ? AND status != 'synced';",
        session.id,
      );
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
        session.startTime,
        session.endTime,
        session.durationMinutes,
        safeTaskId,
        safeTagId,
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

const buildPendingDownsyncEntries = (
  entries: NormalizedEntries,
  localState: LocalEntriesState,
): DownsyncPreviewEntry[] => {
  const remoteTagsById = new Map(entries.tags.map((tag) => [tag.id, tag]));
  const remoteTasksById = new Map(entries.tasks.map((task) => [task.id, task]));
  const pendingEntries: DownsyncPreviewEntry[] = [];

  for (const tag of entries.tags) {
    const localTag = localState.tagsById.get(tag.id);
    if (matchesTag(localTag, tag)) {
      continue;
    }

    pendingEntries.push({
      id: `tag:${tag.id}`,
      entityType: 'tag',
      entityId: tag.id,
      title: tag.name,
      subtitle: `Tag · ${buildStatusLabel(Boolean(localTag))}`,
      detail: `Farbe ${tag.color}`,
      statusLabel: buildStatusLabel(Boolean(localTag)),
    });
  }

  for (const task of entries.tasks) {
    const localTask = localState.tasksById.get(task.id);
    if (matchesTask(localTask, task)) {
      continue;
    }

    const taskTag = remoteTagsById.get(task.tagId);
    const dependencies: string[] = [];
    if (taskTag && !matchesTag(localState.tagsById.get(taskTag.id), taskTag)) {
      dependencies.push(`Tag „${taskTag.name}“`);
    }

    pendingEntries.push({
      id: `task:${task.id}`,
      entityType: 'task',
      entityId: task.id,
      title: task.title,
      subtitle: `Aufgabe · ${buildStatusLabel(Boolean(localTask))}`,
      detail: `${task.date ?? 'Ohne Datum'} · ${task.isCompleted ? 'Erledigt' : 'Offen'}`,
      statusLabel: buildStatusLabel(Boolean(localTask)),
      dependencyHint: buildDependencyHint(dependencies),
    });
  }

  for (const session of entries.sessions) {
    const localSession = localState.sessionsById.get(session.id);
    if (matchesSession(localSession, session)) {
      continue;
    }

    const dependencies: string[] = [];
    const sessionTag = remoteTagsById.get(session.tagId);
    if (sessionTag && !matchesTag(localState.tagsById.get(sessionTag.id), sessionTag)) {
      dependencies.push(`Tag „${sessionTag.name}“`);
    }

    const sessionTask = session.taskId ? remoteTasksById.get(session.taskId) : null;
    if (sessionTask && !matchesTask(localState.tasksById.get(sessionTask.id), sessionTask)) {
      dependencies.push(`Aufgabe „${sessionTask.title}“`);
    }

    const relationLabel = sessionTask ? ` · ${sessionTask.title}` : '';

    pendingEntries.push({
      id: `session:${session.id}`,
      entityType: 'session',
      entityId: session.id,
      title: session.title,
      subtitle: `Session · ${buildStatusLabel(Boolean(localSession))}`,
      detail: `${session.date} · ${session.durationMinutes} min${relationLabel}`,
      statusLabel: buildStatusLabel(Boolean(localSession)),
      dependencyHint: buildDependencyHint(dependencies),
    });
  }

  return pendingEntries.sort((left, right) => {
    if (DOWNYNC_TYPE_ORDER[left.entityType] !== DOWNYNC_TYPE_ORDER[right.entityType]) {
      return DOWNYNC_TYPE_ORDER[left.entityType] - DOWNYNC_TYPE_ORDER[right.entityType];
    }

    return left.title.localeCompare(right.title, 'de-DE');
  });
};

const buildImportSubset = async (
  entries: NormalizedEntries,
  entityType: DownsyncEntityType,
  entityId: string,
): Promise<NormalizedEntries> => {
  const localState = await loadLocalEntriesState();
  const remoteTagsById = new Map(entries.tags.map((tag) => [tag.id, tag]));
  const remoteTasksById = new Map(entries.tasks.map((task) => [task.id, task]));
  const remoteSessionsById = new Map(entries.sessions.map((session) => [session.id, session]));
  const subset: NormalizedEntries = {
    tags: [],
    tasks: [],
    sessions: [],
  };
  const includedTags = new Set<string>();
  const includedTasks = new Set<string>();

  const ensureTag = (tagId: string): string => {
    if (tagId === GENERAL_TAG_ID && !remoteTagsById.has(GENERAL_TAG_ID)) {
      return GENERAL_TAG_ID;
    }

    const remoteTag = remoteTagsById.get(tagId);
    if (remoteTag) {
      if (!includedTags.has(remoteTag.id)) {
        subset.tags.push(remoteTag);
        includedTags.add(remoteTag.id);
      }

      return remoteTag.id;
    }

    return localState.tagsById.has(tagId) ? tagId : GENERAL_TAG_ID;
  };

  const ensureTask = (taskId: string | null): string | null => {
    if (!taskId) {
      return null;
    }

    const remoteTask = remoteTasksById.get(taskId);
    if (remoteTask) {
      if (!includedTasks.has(remoteTask.id)) {
        subset.tasks.push({
          ...remoteTask,
          tagId: ensureTag(remoteTask.tagId),
        });
        includedTasks.add(remoteTask.id);
      }

      return remoteTask.id;
    }

    return localState.tasksById.has(taskId) ? taskId : null;
  };

  if (entityType === 'tag') {
    const remoteTag = remoteTagsById.get(entityId);
    if (!remoteTag) {
      throw new Error('Der ausgewählte Server-Tag wurde nicht mehr gefunden.');
    }

    ensureTag(remoteTag.id);
    return subset;
  }

  if (entityType === 'task') {
    const remoteTask = remoteTasksById.get(entityId);
    if (!remoteTask) {
      throw new Error('Die ausgewählte Server-Aufgabe wurde nicht mehr gefunden.');
    }

    ensureTask(remoteTask.id);
    return subset;
  }

  const remoteSession = remoteSessionsById.get(entityId);
  if (!remoteSession) {
    throw new Error('Die ausgewählte Server-Session wurde nicht mehr gefunden.');
  }

  subset.sessions.push({
    ...remoteSession,
    tagId: ensureTag(remoteSession.tagId),
    taskId: ensureTask(remoteSession.taskId),
  });

  return subset;
};

export const listPendingDownsyncEntries = async (): Promise<DownsyncPreviewEntry[]> => {
  const [entries, localState] = await Promise.all([
    fetchNormalizedEntries(),
    loadLocalEntriesState(),
  ]);

  return buildPendingDownsyncEntries(entries, localState);
};

export const applyPendingDownsyncEntry = async (
  entityType: DownsyncEntityType,
  entityId: string,
): Promise<void> => {
  const entries = await fetchNormalizedEntries();
  const subset = await buildImportSubset(entries, entityType, entityId);
  await applyEntries(subset);
};

export const downsyncEntries = async (): Promise<void> => {
  if (Platform.OS !== 'web') {
    return;
  }

  const entries = await fetchNormalizedEntries();
  await applyEntries(entries);
};
