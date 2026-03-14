export type SessionSyncStatus = 'pending' | 'synced' | 'failed';

export interface Session {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  taskId: string | null;
  tagId: string;
  syncStatus: SessionSyncStatus;
  createdAt: string;
}

export interface CreateSessionInput {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  taskId?: string | null;
  tagId: string;
  syncStatus?: SessionSyncStatus;
}

export interface UpdateSessionAssignmentInput {
  taskId: string | null;
  title: string;
  tagId: string;
}

export interface UpdateSessionInput {
  title: string;
  tagId: string;
}
