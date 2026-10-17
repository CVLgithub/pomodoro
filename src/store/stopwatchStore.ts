import { create } from 'zustand';

import { FREE_SESSION_TITLE, GENERAL_TAG_ID } from '../constants/config';
import { getStopwatchState, saveStopwatchState } from '../db/repositories/stopwatchRepository';
import { createSession } from '../db/repositories/sessionsRepository';
import { getTagById } from '../db/repositories/tagsRepository';
import { getTaskById } from '../db/repositories/tasksRepository';
import { toSessionPushPayload } from '../services/sync/payloads';
import { syncManager } from '../services/sync/syncManager';
import { StopwatchStateRecord } from '../types/stopwatch';
import { formatDateKey, toLocalIsoString } from '../utils/date';
import { useSessionsStore } from './sessionsStore';
import { useSyncStore } from './syncStore';

interface StopwatchStoreState extends StopwatchStateRecord {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  start: () => Promise<void>;
  switchPhase: () => Promise<void>;
  stop: () => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  setFreeSessionTag: (tagId: string) => Promise<void>;
  handleDeletedTask: (taskId: string) => Promise<void>;
  handleDeletedTag: (tagId: string) => Promise<void>;
}

const elapsedInCurrentPhase = (state: StopwatchStateRecord, now: Date): number => {
  if (state.status !== 'running' || !state.phaseStartedAt) {
    return 0;
  }

  return Math.max(0, Math.floor((now.getTime() - new Date(state.phaseStartedAt).getTime()) / 1000));
};

const resetStopwatch = (state: StopwatchStateRecord): StopwatchStateRecord => ({
  ...state,
  status: 'idle',
  phase: 'active',
  sessionStartedAt: null,
  phaseStartedAt: null,
  activeElapsedSeconds: 0,
  breakElapsedSeconds: 0,
});

const swallowSyncError = async (work: Promise<void>): Promise<void> => {
  try {
    await work;
  } catch {
    // Sync failures are captured by the queue.
  }
};

export const useStopwatchStore = create<StopwatchStoreState>((set, get) => ({
  id: 'default',
  status: 'idle',
  phase: 'active',
  sessionStartedAt: null,
  phaseStartedAt: null,
  activeElapsedSeconds: 0,
  breakElapsedSeconds: 0,
  selectedTaskId: null,
  selectedTagId: GENERAL_TAG_ID,
  isHydrated: false,
  hydrate: async () => {
    let state = await getStopwatchState();

    if (state.selectedTaskId && !(await getTaskById(state.selectedTaskId))) {
      state = { ...state, selectedTaskId: null };
    }

    if (!(await getTagById(state.selectedTagId))) {
      state = { ...state, selectedTagId: GENERAL_TAG_ID };
    }

    await saveStopwatchState(state);
    set({ ...state, isHydrated: true });
  },
  start: async () => {
    const current = get();
    if (current.status !== 'idle') {
      return;
    }

    const now = toLocalIsoString();
    const nextState: StopwatchStateRecord = {
      ...current,
      status: 'running',
      phase: 'active',
      sessionStartedAt: now,
      phaseStartedAt: now,
      activeElapsedSeconds: 0,
      breakElapsedSeconds: 0,
    };

    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  switchPhase: async () => {
    const current = get();
    if (current.status !== 'running') {
      return;
    }

    const now = new Date();
    const elapsed = elapsedInCurrentPhase(current, now);
    const nextState: StopwatchStateRecord = {
      ...current,
      phase: current.phase === 'active' ? 'break' : 'active',
      phaseStartedAt: toLocalIsoString(now),
      activeElapsedSeconds:
        current.phase === 'active'
          ? current.activeElapsedSeconds + elapsed
          : current.activeElapsedSeconds,
      breakElapsedSeconds:
        current.phase === 'break'
          ? current.breakElapsedSeconds + elapsed
          : current.breakElapsedSeconds,
    };

    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  stop: async () => {
    const current = get();
    if (current.status !== 'running') {
      return;
    }

    const now = new Date();
    const currentPhaseSeconds = elapsedInCurrentPhase(current, now);
    const activeElapsedSeconds =
      current.activeElapsedSeconds +
      (current.phase === 'active' ? currentPhaseSeconds : 0);
    const startTime = current.sessionStartedAt ?? toLocalIsoString(now);

    if (activeElapsedSeconds > 0) {
      const task = current.selectedTaskId ? await getTaskById(current.selectedTaskId) : null;
      const tag = await getTagById(task?.tagId ?? current.selectedTagId);
      const session = await createSession({
        title: task?.title ?? FREE_SESSION_TITLE,
        date: formatDateKey(startTime),
        startTime,
        endTime: toLocalIsoString(now),
        durationMinutes: Math.max(1, Math.round(activeElapsedSeconds / 60)),
        taskId: task?.id ?? null,
        tagId: tag?.id ?? GENERAL_TAG_ID,
      });

      await useSessionsStore.getState().loadSessions();
      await swallowSyncError(syncManager.pushSession(toSessionPushPayload(session)));
      await useSyncStore.getState().loadQueue();
    }

    const nextState = resetStopwatch(current);
    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  selectTask: async (taskId) => {
    const current = get();
    if (!taskId) {
      const nextState = { ...current, selectedTaskId: null };
      await saveStopwatchState(nextState);
      set({ ...nextState });
      return;
    }

    const task = await getTaskById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const nextState = {
      ...current,
      selectedTaskId: task.id,
      selectedTagId: task.tagId,
    };
    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  setFreeSessionTag: async (tagId) => {
    if (!(await getTagById(tagId))) {
      throw new Error('Tag not found');
    }

    const nextState = {
      ...get(),
      selectedTaskId: null,
      selectedTagId: tagId,
    };
    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  handleDeletedTask: async (taskId) => {
    const current = get();
    if (current.selectedTaskId !== taskId) {
      return;
    }

    const nextState = {
      ...current,
      selectedTaskId: null,
      selectedTagId: GENERAL_TAG_ID,
    };
    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
  handleDeletedTag: async (tagId) => {
    const current = get();
    if (current.selectedTagId !== tagId) {
      return;
    }

    const nextState = { ...current, selectedTagId: GENERAL_TAG_ID };
    await saveStopwatchState(nextState);
    set({ ...nextState });
  },
}));