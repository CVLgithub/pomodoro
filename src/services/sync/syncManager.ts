import { createSyncQueueItem, getSyncQueueItemById, listSyncQueueItems, updateSyncQueueItemStatus } from '../../db/repositories/syncQueueRepository';
import { updateSessionSyncStatus } from '../../db/repositories/sessionsRepository';
import { PushSessionPayload, PushTagPayload, PushTaskPayload } from '../../types/api';
import { Session } from '../../types/session';
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

const performSyncRequest = async (
  item: SyncQueueItem,
  payload: PushTaskPayload | PushTagPayload | PushSessionPayload,
  retryCount = item.retryCount,
): Promise<void> => {
  try {
    await syncHandlers[item.entityType](payload);
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
  const queueItem = await createSyncQueueItem({
    entityType,
    entityId,
    endpoint,
    payloadJson: JSON.stringify(payload),
  });

  await performSyncRequest(queueItem, payload);
};

export const syncManager = {
  pushTask: async (entityId: string, payload: PushTaskPayload): Promise<void> => {
    await enqueueAndPush('task', entityId, '/push/task', payload);
  },
  pushTag: async (entityId: string, payload: PushTagPayload): Promise<void> => {
    await enqueueAndPush('tag', entityId, '/push/tag', payload);
  },
  pushSession: async (session: Omit<Session, 'syncStatus'>): Promise<void> => {
    await enqueueAndPush('session', session.id, '/push/session', session);
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

