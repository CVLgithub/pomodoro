import {
  createSyncQueueItem,
  deleteSyncQueueItem,
  deleteUnsyncedSyncQueueItemsByEntity,
  getLatestSyncQueueItemForEntity,
  getSyncQueueItemById,
  listSyncQueueItems,
  updateSyncQueueItemStatus,
} from '../../db/repositories/syncQueueRepository';
import { updateSessionSyncStatus } from '../../db/repositories/sessionsRepository';
import {
  PushSessionPayload,
  PushTagPayload,
  PushTagGroupPayload,
  PushTaskPayload,
} from '../../types/api';
import { SyncEntityType, SyncQueueItem } from '../../types/sync';
import {
  pushSessionPayload,
  pushTagPayload,
  pushTagGroupPayload,
  pushTaskPayload,
} from '../api/pushService';
import { ApiRequestError } from '../api/client';
import { isQueueItemBlockedByEarlier, orderQueueFifo } from './syncPrimitives';

type SyncPayload =
  | PushTaskPayload
  | PushTagPayload
  | PushTagGroupPayload
  | PushSessionPayload;

const syncHandlers: Record<
  SyncEntityType,
  (payload: SyncPayload) => Promise<void>
> = {
  task: async (payload) => pushTaskPayload(payload as PushTaskPayload),
  tag: async (payload) => pushTagPayload(payload as PushTagPayload),
  tagGroup: async (payload) => pushTagGroupPayload(payload as PushTagGroupPayload),
  session: async (payload) => pushSessionPayload(payload as PushSessionPayload),
};

const normalizeSyncPayload = (
  entityType: SyncEntityType,
  payload: SyncPayload,
): SyncPayload => {
  if (entityType === 'task') {
    const taskPayload = payload as PushTaskPayload;

    if (!('title' in taskPayload)) {
      return taskPayload;
    }

    return {
      id: taskPayload.id,
      title: taskPayload.title,
      date: taskPayload.date,
      tagId: taskPayload.tagId,
      isCompleted: taskPayload.isCompleted,
      recurrenceType: taskPayload.recurrenceType,
      recurrenceDays: taskPayload.recurrenceDays,
      createdAt: taskPayload.createdAt,
      updatedAt: taskPayload.updatedAt,
      isDeleted: taskPayload.isDeleted,
      deletedAt: taskPayload.deletedAt,
    };
  }

  if (entityType === 'tagGroup') {
    return payload as PushTagGroupPayload;
  }

  if (entityType === 'tag') {
    const tagPayload = payload as PushTagPayload;

    if (!('name' in tagPayload)) {
      return tagPayload;
    }

    return {
      id: tagPayload.id,
      name: tagPayload.name,
      color: tagPayload.color,
      groupId: tagPayload.groupId,
      createdAt: tagPayload.createdAt,
      updatedAt: tagPayload.updatedAt,
      isDeleted: tagPayload.isDeleted,
      deletedAt: tagPayload.deletedAt,
    };
  }

  const sessionPayload = payload as PushSessionPayload;

  return {
    id: sessionPayload.id,
    title: sessionPayload.title,
    date: sessionPayload.date,
    startTime: sessionPayload.startTime,
    endTime: sessionPayload.endTime,
    durationMinutes: sessionPayload.durationMinutes,
    taskId: sessionPayload.taskId,
    tagId: sessionPayload.tagId,
    createdAt: sessionPayload.createdAt,
    updatedAt: sessionPayload.updatedAt,
    isDeleted: sessionPayload.isDeleted,
    deletedAt: sessionPayload.deletedAt,
  };
};

const isQueueItemSuperseded = async (item: SyncQueueItem): Promise<boolean> => {
  const latestItem = await getLatestSyncQueueItemForEntity(item.entityType, item.entityId);

  return Boolean(latestItem && latestItem.id !== item.id);
};

const performSyncRequest = async (
  item: SyncQueueItem,
  payload: SyncPayload,
  retryCount = item.retryCount,
): Promise<void> => {
  if (await isQueueItemSuperseded(item)) {
    await deleteSyncQueueItem(item.id);
    return;
  }

  const normalizedPayload = normalizeSyncPayload(item.entityType, payload);

  try {
    await syncHandlers[item.entityType](normalizedPayload);
    await updateSyncQueueItemStatus(item.id, 'synced', { retryCount });

    if (item.entityType === 'session') {
      await updateSessionSyncStatus(item.entityId, 'synced');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    const isMissingUserId = message.startsWith('Keine userId konfiguriert.');
    const isClientError = error instanceof ApiRequestError && error.status >= 400 && error.status < 500;
    await updateSyncQueueItemStatus(item.id, isMissingUserId ? 'pending' : isClientError ? 'failed' : 'pending', {
      errorMessage: isMissingUserId ? null : message,
      retryCount,
    });

    if (item.entityType === 'session') {
      await updateSessionSyncStatus(item.entityId, 'failed');
    }

    throw error;
  }
};

const enqueueAndPush = async (
  entityType: SyncEntityType,
  entityId: string,
  endpoint: string,
  payload: SyncPayload,
): Promise<void> => {
  const normalizedPayload = normalizeSyncPayload(entityType, payload);
  const existing = await getLatestSyncQueueItemForEntity(entityType, entityId);
  if (existing) {
    const existingPayload = JSON.parse(existing.payloadJson) as { updatedAt?: string; isDeleted?: boolean };
    if (
      existingPayload.updatedAt &&
      normalizedPayload.updatedAt < existingPayload.updatedAt
    ) {
      return;
    }
  }
  await deleteUnsyncedSyncQueueItemsByEntity(entityType, entityId);
  const queueItem = await createSyncQueueItem({
    entityType,
    entityId,
    endpoint,
    payloadJson: JSON.stringify(normalizedPayload),
  });

  await performSyncRequest(queueItem, normalizedPayload);
};

export const syncManager = {
  pushTask: async (entityId: string, payload: PushTaskPayload): Promise<void> => {
    await enqueueAndPush('task', entityId, '/push/task', payload);
  },
  pushTag: async (entityId: string, payload: PushTagPayload): Promise<void> => {
    await enqueueAndPush('tag', entityId, '/push/tag', payload);
  },
  pushTagGroup: async (payload: PushTagGroupPayload): Promise<void> => {
    await enqueueAndPush('tagGroup', payload.id, '/push/tag-group', payload);
  },
  pushSession: async (payload: PushSessionPayload): Promise<void> => {
    await enqueueAndPush('session', payload.id, '/push/session', payload);
  },
  retryQueueItem: async (queueItemId: string): Promise<void> => {
    const item = await getSyncQueueItemById(queueItemId);

    if (!item) {
      throw new Error('Sync queue item not found');
    }

    if (await isQueueItemSuperseded(item)) {
      await deleteSyncQueueItem(item.id);
      return;
    }

    const payload = JSON.parse(item.payloadJson) as
      | PushTaskPayload
      | PushTagPayload
      | PushTagGroupPayload
      | PushSessionPayload;

    await performSyncRequest(item, payload, item.retryCount + 1);
  },
  retryAllFailed: async (): Promise<void> => {
    const items = orderQueueFifo(
      (await listSyncQueueItems()).filter((item) => item.status === 'failed'),
    );

    for (const [index, item] of items.entries()) {
      if (isQueueItemBlockedByEarlier(item, items.slice(index))) {
        continue;
      }
      try {
        await syncManager.retryQueueItem(item.id);
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status >= 400 && error.status < 500)) {
          break;
        }
      }
    }
  },
  flushQueue: async (): Promise<void> => {
    const items = orderQueueFifo(
      (await listSyncQueueItems()).filter((item) => item.status === 'pending'),
    );
    for (const [index, item] of items.entries()) {
      if (isQueueItemBlockedByEarlier(item, items.slice(index))) {
        continue;
      }
      try {
        await syncManager.retryQueueItem(item.id);
      } catch (error) {
        if (!(error instanceof ApiRequestError && error.status >= 400 && error.status < 500)) {
          break;
        }
      }
    }
  },
};
