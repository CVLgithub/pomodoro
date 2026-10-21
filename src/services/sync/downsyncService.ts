import { GENERAL_TAG_ID, GENERAL_TAG_NAME } from '../../constants/config';
import { getDatabase } from '../../db/client';
import { listTagGroups } from '../../db/repositories/tagGroupsRepository';
import {
  listAllSessions,
} from '../../db/repositories/sessionsRepository';
import { listTags } from '../../db/repositories/tagsRepository';
import { listTasks } from '../../db/repositories/tasksRepository';
import { EntriesResponse, EntriesSession, EntriesTag, EntriesTask } from '../../types/api';
import { TagGroup } from '../../types/tagGroup';
import { Session } from '../../types/session';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import {
  formatTaskRecurrenceDays,
  normalizeTaskRecurrence,
} from '../../utils/taskRecurrence';
import { fetchEntries } from '../api/entriesService';
import { syncManager } from './syncManager';
import { mergeByUpdatedAt } from './syncPrimitives';

const TIME_ONLY_PATTERN = /^\d{2}:\d{2}(?::\d{2})?$/;

export type DownsyncEntityType = 'tag' | 'tagGroup' | 'task' | 'session';

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

type NormalizedEntries = Omit<EntriesResponse, 'tagGroups'> & {
  tagGroups: TagGroup[];
};

type LocalEntriesState = {
  tagsById: Map<string, Tag>;
  tasksById: Map<string, Task>;
  sessionsById: Map<string, Session>;
  tagGroups: TagGroup[];
};

const DOWNYNC_TYPE_ORDER: Record<DownsyncEntityType, number> = {
  tagGroup: 0,
  tag: 1,
  task: 2,
  session: 3,
};

const isGeneralTagName = (value: string): boolean =>
  value.trim().localeCompare(GENERAL_TAG_NAME, 'de-DE', { sensitivity: 'accent' }) === 0;

const hasTagGroupName = (groups: TagGroup[], groupName: string): boolean =>
  groups.some(
    (entry) => entry.name.localeCompare(groupName, 'de-DE', { sensitivity: 'base' }) === 0,
  );

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
    tagGroups: entries.tagGroups ?? [],
    tags: Array.from(normalizedTagsMap.values()),
    tasks: entries.tasks.map((task) => ({
      ...task,
      tagId: tagIdMap.get(task.tagId) ?? task.tagId,
      ...normalizeTaskRecurrence(task.recurrenceType, task.recurrenceDays),
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
  const [tags, tasks, sessions, savedTagGroups] = await Promise.all([
    listTags(),
    listTasks(),
    listAllSessions(),
    listTagGroups(),
  ]);

  return {
    tagsById: new Map(tags.map((tag) => [tag.id, tag])),
    tasksById: new Map(tasks.map((task) => [task.id, task])),
    sessionsById: new Map(sessions.map((session) => [session.id, session])),
    tagGroups: savedTagGroups,
  };
};

const matchesTag = (localTag: Tag | undefined, remoteTag: EntriesTag): boolean =>
  Boolean(
    localTag &&
      localTag.id === remoteTag.id &&
      localTag.name === remoteTag.name &&
      localTag.color === remoteTag.color &&
      localTag.groupId === remoteTag.groupId &&
      localTag.createdAt === remoteTag.createdAt &&
      localTag.updatedAt === remoteTag.updatedAt,
  );

const matchesTask = (localTask: Task | undefined, remoteTask: EntriesTask): boolean => {
  const normalizedRecurrence = normalizeTaskRecurrence(
    remoteTask.recurrenceType,
    remoteTask.recurrenceDays,
  );

  return Boolean(
    localTask &&
      localTask.id === remoteTask.id &&
      localTask.title === remoteTask.title &&
      localTask.date === remoteTask.date &&
      localTask.tagId === remoteTask.tagId &&
      localTask.isCompleted === remoteTask.isCompleted &&
      localTask.recurrenceType === normalizedRecurrence.recurrenceType &&
      JSON.stringify(localTask.recurrenceDays) ===
        JSON.stringify(normalizedRecurrence.recurrenceDays) &&
      localTask.createdAt === remoteTask.createdAt &&
      localTask.updatedAt === remoteTask.updatedAt,
  );
};

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
  existsLocally ? 'Geändert' : 'Neu';

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
    for (const group of entries.tagGroups) {
      const localGroup = await db.getFirstAsync<{ updatedAt: string }>(
        'SELECT updatedAt FROM tag_groups WHERE id = ?;',
        group.id,
      );
      const selected = mergeByUpdatedAt(
        localGroup
          ? { id: group.id, updatedAt: localGroup.updatedAt, isDeleted: false, deletedAt: null }
          : undefined,
        group,
      );
      if (selected !== group) {
        continue;
      }
      await db.runAsync(
        `INSERT INTO tag_groups (id, name, createdAt, updatedAt, isDeleted, deletedAt)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           createdAt = excluded.createdAt,
           updatedAt = excluded.updatedAt,
           isDeleted = excluded.isDeleted,
           deletedAt = excluded.deletedAt;`,
        group.id,
        group.name,
        group.createdAt,
        group.updatedAt,
        group.isDeleted ? 1 : 0,
        group.deletedAt,
      );
    }

    for (const tag of entries.tags) {
      const localTag = await db.getFirstAsync<{ updatedAt: string }>(
        'SELECT updatedAt FROM tags WHERE id = ?;',
        tag.id,
      );
      const selected = mergeByUpdatedAt(
        localTag
          ? { id: tag.id, updatedAt: localTag.updatedAt, isDeleted: false, deletedAt: null }
          : undefined,
        tag,
      );
      if (selected !== tag) {
        continue;
      }
      await db.runAsync(
        `
          INSERT INTO tags (id, name, color, groupId, createdAt, updatedAt, isDeleted, deletedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            color = excluded.color,
            groupId = excluded.groupId,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt,
            isDeleted = excluded.isDeleted,
            deletedAt = excluded.deletedAt;
        `,
        tag.id,
        tag.name,
        tag.color,
        tag.groupId,
        tag.createdAt,
        tag.updatedAt,
        tag.isDeleted ? 1 : 0,
        tag.deletedAt,
      );
    }

    for (const task of entries.tasks) {
      const normalizedRecurrence = normalizeTaskRecurrence(
        task.recurrenceType,
        task.recurrenceDays,
      );

      const localTask = await db.getFirstAsync<{ updatedAt: string }>(
        'SELECT updatedAt FROM tasks WHERE id = ?;',
        task.id,
      );
      const selected = mergeByUpdatedAt(
        localTask
          ? { id: task.id, updatedAt: localTask.updatedAt, isDeleted: false, deletedAt: null }
          : undefined,
        task,
      );
      if (selected !== task) {
        continue;
      }
      await db.runAsync(
        `
          INSERT INTO tasks (
            id, title, date, tagId, isCompleted, completedAt, recurrenceType, recurrenceDays, createdAt, updatedAt, isDeleted, deletedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            date = excluded.date,
            tagId = excluded.tagId,
            isCompleted = excluded.isCompleted,
            completedAt =
              CASE
                WHEN excluded.isCompleted = 0 THEN NULL
                ELSE COALESCE(tasks.completedAt, excluded.updatedAt)
              END,
            recurrenceType = excluded.recurrenceType,
            recurrenceDays = excluded.recurrenceDays,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt,
            isDeleted = excluded.isDeleted,
            deletedAt = excluded.deletedAt;
        `,
        task.id,
        task.title,
        task.date,
        task.tagId,
        task.isCompleted ? 1 : 0,
        task.isCompleted ? task.updatedAt : null,
        normalizedRecurrence.recurrenceType,
        JSON.stringify(normalizedRecurrence.recurrenceDays),
        task.createdAt,
        task.updatedAt,
        task.isDeleted ? 1 : 0,
        task.deletedAt,
      );
    }

    for (const session of entries.sessions) {
      const safeTaskId = session.taskId && availableTaskIds.has(session.taskId) ? session.taskId : null;
      const safeTagId = availableTagIds.has(session.tagId) ? session.tagId : GENERAL_TAG_ID;
      const createdAt = session.endTime.includes('T') ? session.endTime : toLocalIsoString();

      const localSession = await db.getFirstAsync<{ updatedAt: string }>(
        'SELECT updatedAt FROM sessions WHERE id = ?;',
        session.id,
      );
      const selected = mergeByUpdatedAt(
        localSession
          ? { id: session.id, updatedAt: localSession.updatedAt, isDeleted: false, deletedAt: null }
          : undefined,
        session,
      );
      if (selected !== session) {
        continue;
      }
      await db.runAsync(
        `
          INSERT INTO sessions (
            id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt, updatedAt, isDeleted, deletedAt
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            title = excluded.title,
            date = excluded.date,
            startTime = excluded.startTime,
            endTime = excluded.endTime,
            durationMinutes = excluded.durationMinutes,
            taskId = excluded.taskId,
            tagId = excluded.tagId,
            syncStatus = excluded.syncStatus,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt,
            isDeleted = excluded.isDeleted,
            deletedAt = excluded.deletedAt;
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
        session.createdAt,
        session.updatedAt,
        session.isDeleted ? 1 : 0,
        session.deletedAt,
      );
    }

    const remoteSessionIds = new Set(entries.sessions.map((session) => session.id));
    for (const localSession of localState.sessionsById.values()) {
      if (!localSession.isDeleted && !remoteSessionIds.has(localSession.id)) {
        const now = toLocalIsoString();
        await db.runAsync(
          `
            UPDATE sessions
            SET isDeleted = 1, deletedAt = ?, updatedAt = ?, syncStatus = 'synced'
            WHERE id = ? AND isDeleted = 0 AND syncStatus = 'synced';
          `,
          now,
          now,
          localSession.id,
        );
      }
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

  for (const group of entries.tagGroups) {
    const groupName = group.name;
    if (
      hasTagGroupName(localState.tagGroups, groupName) ||
      entries.tagGroups.some(
        (entry) => entry.name.localeCompare(groupName, 'de-DE', { sensitivity: 'base' }) === 0,
      )
    ) {
      continue;
    }

    pendingEntries.push({
      id: `tagGroups:${groupName}`,
      entityType: 'tagGroup',
      entityId: group.id,
      title: groupName,
      subtitle: 'Gruppe · Neu',
      detail: 'Leere Tag-Gruppe',
      statusLabel: 'Neu',
    });
  }

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
      detail: `Gruppe ${tag.groupId ?? 'Allgemein'} - Farbe ${tag.color}`,
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
      detail: `${task.recurrenceType === 'weekly' ? `Wiederholend - ${formatTaskRecurrenceDays(task.recurrenceDays ?? [])}` : task.date ?? 'Ohne Datum'} · ${task.isCompleted ? 'Erledigt' : 'Offen'}`,
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
    tagGroups: [],
    tags: [],
    tasks: [],
    sessions: [],
  };
  const includedTags = new Set<string>();
  const includedTagGroups = new Set<string>();
  const includedTasks = new Set<string>();

  const ensureTagGroup = (groupId?: string | null): void => {
    const remoteGroup = groupId ? entries.tagGroups.find((group) => group.id === groupId) : undefined;
    if (!remoteGroup || includedTagGroups.has(remoteGroup.id)) {
      return;
    }

    subset.tagGroups.push(remoteGroup);
    includedTagGroups.add(remoteGroup.id);
  };

  const ensureTag = (tagId: string): string => {
    if (tagId === GENERAL_TAG_ID && !remoteTagsById.has(GENERAL_TAG_ID)) {
      return GENERAL_TAG_ID;
    }

    const remoteTag = remoteTagsById.get(tagId);
    if (remoteTag) {
      if (!includedTags.has(remoteTag.id)) {
        subset.tags.push(remoteTag);
        includedTags.add(remoteTag.id);
        ensureTagGroup(remoteTag.groupId);
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
      throw new Error('Der ausgewählte Tag wurde nicht mehr gefunden.');
    }

    ensureTag(remoteTag.id);
    return subset;
  }

  if (entityType === 'tagGroup') {
    const remoteGroup = entries.tagGroups.find((group) => group.id === entityId);

    if (!remoteGroup) {
      throw new Error('Die ausgewählte Gruppe wurde nicht mehr gefunden.');
    }

    ensureTagGroup(remoteGroup.name);
    return subset;
  }

  if (entityType === 'task') {
    const remoteTask = remoteTasksById.get(entityId);
    if (!remoteTask) {
      throw new Error('Die ausgewählte Aufgabe wurde nicht mehr gefunden.');
    }

    ensureTask(remoteTask.id);
    return subset;
  }

  const remoteSession = remoteSessionsById.get(entityId);
  if (!remoteSession) {
    throw new Error('Die ausgewählte Session wurde nicht mehr gefunden.');
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
  let queueError: unknown = null;
  try {
    await syncManager.flushQueue();
  } catch (error) {
    queueError = error;
  }

  const entries = await fetchNormalizedEntries();
  await applyEntries(entries);

  if (queueError) {
    throw new Error(
      `Serverdaten wurden geladen, aber ausstehende Übertragungen konnten nicht abgeschlossen werden: ${
        queueError instanceof Error ? queueError.message : 'Unbekannter Fehler'
      }`,
    );
  }
};
