import { create } from 'zustand';

import { FREE_SESSION_TITLE, GENERAL_TAG_ID } from '../constants/config';
import {
  createSession,
  deleteSession,
  getLatestSession,
  getSessionById,
  listSessions,
  listDeletedSessions,
  restoreSession,
  updateSession,
  updateSessionAssignment,
} from '../db/repositories/sessionsRepository';
import { getTaskById } from '../db/repositories/tasksRepository';
import { Session } from '../types/session';
import { syncManager } from '../services/sync/syncManager';
import { toSessionPushPayload } from '../services/sync/payloads';
import { differenceInMinutes } from '../utils/date';
import { useSyncStore } from './syncStore';

interface SessionAssignmentOptions {
  taskId: string | null;
  tagId?: string;
}

interface SessionsStoreState {
  sessions: Session[];
  deletedSessions: Session[];
  latestSession: Session | null;
  isLoading: boolean;
  loadSessions: () => Promise<void>;
  refreshLatestSession: () => Promise<void>;
  createSessionEntry: (input: {
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    tagId: string;
  }) => Promise<Session>;
  assignSession: (sessionId: string, options: SessionAssignmentOptions) => Promise<void>;
  updateSessionEntry: (sessionId: string, input: { title: string; tagId: string }) => Promise<void>;
  deleteSessionEntry: (sessionId: string) => Promise<void>;
  restoreSessionEntry: (sessionId: string) => Promise<void>;
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
  deletedSessions: [],
  latestSession: null,
  isLoading: false,
  loadSessions: async () => {
    set({ isLoading: true });

    try {
      const [sessions, latestSession, deletedSessions] = await Promise.all([
        listSessions(),
        getLatestSession(),
        listDeletedSessions(),
      ]);
      set({ sessions, latestSession, deletedSessions });
    } finally {
      set({ isLoading: false });
    }
  },
  refreshLatestSession: async () => {
    const latestSession = await getLatestSession();
    set({ latestSession });
  },
  createSessionEntry: async (input) => {
    if (!input.title.trim()) {
      throw new Error('Name is required');
    }

    const durationMinutes = differenceInMinutes(input.endTime, input.startTime);
    const createdSession = await createSession({
      title: input.title.trim(),
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      tagId: input.tagId || GENERAL_TAG_ID,
      taskId: null,
    });

    await get().loadSessions();
    await swallowSyncError(syncManager.pushSession(toSessionPushPayload(createdSession)));
    await useSyncStore.getState().loadQueue();
    return createdSession;
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
  updateSessionEntry: async (sessionId, input) => {
    if (!input.title.trim()) {
      throw new Error('Name is required');
    }

    const updatedSession = await updateSession(sessionId, input);
    await get().loadSessions();
    await swallowSyncError(syncManager.pushSession(toSessionPushPayload(updatedSession)));
    await useSyncStore.getState().loadQueue();
  },
  deleteSessionEntry: async (sessionId) => {
    await deleteSession(sessionId);
    await get().loadSessions();
    await useSyncStore.getState().loadQueue();
  },
  restoreSessionEntry: async (sessionId) => {
    const restored = await restoreSession(sessionId);
    await get().loadSessions();
    await swallowSyncError(syncManager.pushSession(toSessionPushPayload(restored)));
    await useSyncStore.getState().loadQueue();
  },
}));
