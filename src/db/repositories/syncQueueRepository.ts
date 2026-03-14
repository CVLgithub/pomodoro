import { CreateSyncQueueItemInput, SyncQueueItem, SyncStatus } from '../../types/sync';
import { toLocalIsoString } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';

type SyncQueueRow = SyncQueueItem;

const mapRow = (row: SyncQueueRow): SyncQueueItem => row;

export const listSyncQueueItems = async (): Promise<SyncQueueItem[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SyncQueueRow>(
    `
      SELECT id, entityType, entityId, endpoint, method, payloadJson, status, errorMessage, retryCount, createdAt, updatedAt
      FROM sync_queue
      ORDER BY updatedAt DESC;
    `,
  );

  return rows.map(mapRow);
};

export const getSyncQueueItemById = async (id: string): Promise<SyncQueueItem | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SyncQueueRow>(
    `
      SELECT id, entityType, entityId, endpoint, method, payloadJson, status, errorMessage, retryCount, createdAt, updatedAt
      FROM sync_queue
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapRow(row) : null;
};

export const createSyncQueueItem = async (
  input: CreateSyncQueueItemInput,
): Promise<SyncQueueItem> => {
  const db = await getDatabase();
  const now = toLocalIsoString();
  const item: SyncQueueItem = {
    id: createUuid(),
    entityType: input.entityType,
    entityId: input.entityId,
    endpoint: input.endpoint,
    method: input.method ?? 'POST',
    payloadJson: input.payloadJson,
    status: input.status ?? 'pending',
    errorMessage: input.errorMessage ?? null,
    retryCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `
      INSERT INTO sync_queue (
        id, entityType, entityId, endpoint, method, payloadJson, status, errorMessage, retryCount, createdAt, updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    item.id,
    item.entityType,
    item.entityId,
    item.endpoint,
    item.method,
    item.payloadJson,
    item.status,
    item.errorMessage,
    item.retryCount,
    item.createdAt,
    item.updatedAt,
  );

  return item;
};

export const updateSyncQueueItemStatus = async (
  id: string,
  status: SyncStatus,
  options?: {
    errorMessage?: string | null;
    retryCount?: number;
  },
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `
      UPDATE sync_queue
      SET status = ?, errorMessage = ?, retryCount = ?, updatedAt = ?
      WHERE id = ?;
    `,
    status,
    options?.errorMessage ?? null,
    options?.retryCount ?? 0,
    toLocalIsoString(),
    id,
  );
};

export const deleteSyncQueueItemsByEntity = async (
  entityType: SyncQueueItem['entityType'],
  entityId: string,
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    'DELETE FROM sync_queue WHERE entityType = ? AND entityId = ?;',
    entityType,
    entityId,
  );
};
