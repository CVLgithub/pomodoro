import { createSyncQueueItem, getSyncQueueItemById, listSyncQueueItems, updateSyncQueueItemStatus } from '../../db/repositories/syncQueueRepository';
import { updateSessionSyncStatus } from '../../db/repositories/sessionsRepository';
import { PushSessionPayload, PushTagPayload, PushTaskPayload } from '../../types/api';
import { SyncEntityType, SyncQueueItem } from '../../types/sync';
import { pushSessionPayload, pushTagPayload, pushTaskPayload } from '../api/pushService';

const syncHandlers: Record<
  SyncEntityType,
  (payload: PushTaskPayload | PushTagPayload | PushSessionPayload) => Promise<void>
> = {
  task: async (payload) => pushTaskPayload(payload as PushTaskPayload),
  tag: async (payload) => pushTagPayload(payload as PushTagPayload),
  session: async (payload) => pushSessionPayload(payload as PushSessionPayload),
};

const normalizeSyncPayload = (
  entityType: SyncEntityType,
  payload: PushTaskPayload | PushTagPayload | PushSessionPayload,
): PushTaskPayload | PushTagPayload | PushSessionPayload => {
  if (entityType === 'task') {
    const taskPayload = payload as PushTaskPayload;

    if ('isDeleted' in taskPayload) {
      return taskPayload;
    }

    return {
      id: taskPayload.id,
      title: taskPayload.title,
      date: taskPayload.date,
      tagId: taskPayload.tagId,
      isCompleted: taskPayload.isCompleted,
    };
  }

  if (entityType === 'tag') {
    const tagPayload = payload as PushTagPayload;

    if ('isDeleted' in tagPayload) {
      return tagPayload;
    }

    return {
      id: tagPayload.id,
      name: tagPayload.name,
      color: tagPayload.color,
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
  };
};

const performSyncRequest = async (
  item: SyncQueueItem,
  payload: PushTaskPayload | PushTagPayload | PushSessionPayload,
  retryCount = item.retryCount,
): Promise<void> => {
  const normalizedPayload = normalizeSyncPayload(item.entityType, payload);

  try {
    await syncHandlers[item.entityType](normalizedPayload);
    await updateSyncQueueItemStatus(item.id, 'synced', { retryCount });

    if (item.entityType === 'session') {
      await updateSessionSyncStatus(item.entityId, 'synced');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    await updateSyncQueueItemStatus(item.id, 'failed', {
      errorMessage: message,
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
  payload: PushTaskPayload | PushTagPayload | PushSessionPayload,
): Promise<void> => {
  const normalizedPayload = normalizeSyncPayload(entityType, payload);
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
  pushSession: async (payload: PushSessionPayload): Promise<void> => {
    await enqueueAndPush('session', payload.id, '/push/session', payload);
  },
  retryQueueItem: async (queueItemId: string): Promise<void> => {
    const item = await getSyncQueueItemById(queueItemId);

    if (!item) {
      throw new Error('Sync queue item not found');
    }

    const payload = JSON.parse(item.payloadJson) as
      | PushTaskPayload
      | PushTagPayload
      | PushSessionPayload;

    await performSyncRequest(item, payload, item.retryCount + 1);
  },
  retryAllFailed: async (): Promise<void> => {
    const items = await listSyncQueueItems();
    const retryableItems = items.filter((item) => item.status !== 'synced');

    for (const item of retryableItems) {
      try {
        await syncManager.retryQueueItem(item.id);
      } catch {
        // Queue items remain visible for manual inspection.
      }
    }
  },
};
