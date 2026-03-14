import { create } from 'zustand';

import { FREE_SESSION_TITLE, GENERAL_TAG_ID } from '../constants/config';
import {
  getLatestSession,
  getSessionById,
  listSessions,
  updateSessionAssignment,
} from '../db/repositories/sessionsRepository';
import { getTaskById } from '../db/repositories/tasksRepository';
import { Session } from '../types/session';
import { syncManager } from '../services/sync/syncManager';
import { toSessionPushPayload } from '../services/sync/payloads';
import { useSyncStore } from './syncStore';

interface SessionAssignmentOptions {
  taskId: string | null;
  tagId?: string;
}

interface SessionsStoreState {
  sessions: Session[];
  latestSession: Session | null;
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  refreshLatestSession: () => Promise<void>;
  assignSession: (sessionId: string, options: SessionAssignmentOptions) => Promise<void>;
}

const swallowSyncError = async (work: Promise<void>): Promise<void> => {
  try {
    await work;
  } catch {
    // Failures are persisted in the sync queue.
  }
};

export const useSessionsStore = create<SessionsStoreState>((set, get) => ({
  sessions: [],
  latestSession: null,
  isLoading: false,
  loadSessions: async () => {
    set({ isLoading: true });

    try {
      const [sessions, latestSession] = await Promise.all([
        listSessions(),
        getLatestSession(),
      ]);
      set({ sessions, latestSession });
    } finally {
      set({ isLoading: false });
    }
  },
  refreshLatestSession: async () => {
    const latestSession = await getLatestSession();
    set({ latestSession });
  },
  assignSession: async (sessionId, options) => {
    const existingSession = await getSessionById(sessionId);

    if (!existingSession) {
      throw new Error('Session not found');
    }

    let title = FREE_SESSION_TITLE;
    let tagId = options.tagId ?? existingSession.tagId ?? GENERAL_TAG_ID;

    if (options.taskId) {
      const task = await getTaskById(options.taskId);

      if (!task) {
        throw new Error('Task not found');
      }

      title = task.title;
      tagId = task.tagId;
    }

    const updatedSession = await updateSessionAssignment(sessionId, {
      taskId: options.taskId,
      title,
      tagId,
    });

    await get().loadSessions();
    await swallowSyncError(syncManager.pushSession(toSessionPushPayload(updatedSession)));
    await useSyncStore.getState().loadQueue();
  },
}));
