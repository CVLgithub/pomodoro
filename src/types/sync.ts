export type SyncEntityType = 'task' | 'tag' | 'tagGroup' | 'session';
export type SyncStatus = 'pending' | 'failed' | 'synced';

export interface SyncQueueItem {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  endpoint: string;
  method: 'POST';
  payloadJson: string;
  status: SyncStatus;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSyncQueueItemInput {
  entityType: SyncEntityType;
  entityId: string;
  endpoint: string;
  method?: 'POST';
  payloadJson: string;
  status?: SyncStatus;
  errorMessage?: string | null;
}
