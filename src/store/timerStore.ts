import { create } from 'zustand';

import { GENERAL_TAG_ID } from '../constants/config';
import { createSession } from '../db/repositories/sessionsRepository';
import { getTagById } from '../db/repositories/tagsRepository';
import { getTaskById } from '../db/repositories/tasksRepository';
import { getTimerState, saveTimerState } from '../db/repositories/timerStateRepository';
import { syncManager } from '../services/sync/syncManager';
import { toSessionPushPayload } from '../services/sync/payloads';
import {
  buildCompletedFocusSession,
  buildTrackedFocusSession,
  isTimerExpired,
} from '../services/timer/timerResume';
import { timerEngine } from '../services/timer/timerEngine';
import { TimerMode, TimerStateRecord } from '../types/timer';
import { toLocalIsoString } from '../utils/date';
import { useSessionsStore } from './sessionsStore';
import { useSyncStore } from './syncStore';

type TimerStateShape = Omit<TimerStateRecord, 'updatedAt'>;
let durationSaveRequestId = 0;
let completionRequestId = 0;

interface TimerStoreState extends TimerStateRecord {
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setMode: (mode: TimerMode) => Promise<void>;
  setDurations: (
    durations: Partial<
      Pick<TimerStateRecord, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'>
    >,
  ) => Promise<void>;
  selectTask: (taskId: string | null) => Promise<void>;
  setFreeSessionTag: (tagId: string) => Promise<void>;
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  finishNow: () => Promise<void>;
  reconcileWithClock: () => Promise<void>;
  handleDeletedTask: (taskId: string) => Promise<void>;
  handleDeletedTag: (tagId: string) => Promise<void>;
}

const stripUpdatedAt = (state: TimerStateRecord): TimerStateShape => {
  const { updatedAt: _updatedAt, ...rest } = state;
  return rest;
};

const swallowSyncError = async (work: Promise<void>): Promise<void> => {
  try {
    await work;
  } catch {
    // Sync failures are stored in the queue.
  }
};

export const useTimerStore = create<TimerStoreState>((set, get) => ({
  ...timerEngine.createDefaultState(),
  isHydrated: false,
  hydrate: async () => {
    let record = await getTimerState();

    if (record.selectedTaskId) {
      const selectedTask = await getTaskById(record.selectedTaskId);
      if (!selectedTask) {
        record = {
          ...record,
          selectedTaskId: null,
          selectedTagId: GENERAL_TAG_ID,
        };
      }
    }

    const selectedTag = await getTagById(record.selectedTagId);
    if (!selectedTag) {
      record = {
        ...record,
        selectedTagId: GENERAL_TAG_ID,
      };
    }

    const persisted = await saveTimerState(stripUpdatedAt(record));
    set({ ...persisted, isHydrated: true });
  },
  setMode: async (mode) => {
    const current = get();
    if (current.status !== 'idle') {
      return;
    }

    const persisted = await saveTimerState(
      stripUpdatedAt(timerEngine.withMode(current, mode)),
    );
    set({ ...persisted });
  },
  setDurations: async (durations) => {
    const values = Object.values(durations);
    if (values.some((value) => typeof value === 'number' && value <= 0)) {
      throw new Error('Minutes must be greater than zero');
    }

    const nextState = timerEngine.withDurations(get(), durations);
    const requestId = ++durationSaveRequestId;

    set({ ...nextState });

    const persisted = await saveTimerState(stripUpdatedAt(nextState));
    if (requestId !== durationSaveRequestId) {
      return;
    }

    set({ ...persisted });
  },
  selectTask: async (taskId) => {
    const current = get();

    if (!taskId) {
      const persisted = await saveTimerState(
        stripUpdatedAt({
          ...current,
          selectedTaskId: null,
          selectedTagId: current.selectedTagId || GENERAL_TAG_ID,
        }),
      );
      set({ ...persisted });
      return;
    }

    const task = await getTaskById(taskId);

    if (!task) {
      throw new Error('Task not found');
    }

    const persisted = await saveTimerState(
      stripUpdatedAt({
        ...current,
        selectedTaskId: task.id,
        selectedTagId: task.tagId,
      }),
    );
    set({ ...persisted });
  },
  setFreeSessionTag: async (tagId) => {
    const current = get();
    const tag = await getTagById(tagId);

    if (!tag) {
      throw new Error('Tag not found');
    }

    const persisted = await saveTimerState(
      stripUpdatedAt({
        ...current,
        selectedTaskId: null,
        selectedTagId: tag.id,
      }),
    );
    set({ ...persisted });
  },
  start: async () => {
    const current = get();
    if (current.status !== 'idle') {
      return;
    }

    const persisted = await saveTimerState(stripUpdatedAt(timerEngine.start(current)));
    set({ ...persisted });
  },
  pause: async () => {
    const current = get();
    if (current.status !== 'running') {
      return;
    }

    const persisted = await saveTimerState(stripUpdatedAt(timerEngine.pause(current)));
    set({ ...persisted });
  },
  resume: async () => {
    const current = get();
    if (current.status !== 'paused') {
      return;
    }

    const persisted = await saveTimerState(stripUpdatedAt(timerEngine.resume(current)));
    set({ ...persisted });
  },
  reset: async () => {
    const persisted = await saveTimerState(stripUpdatedAt(timerEngine.reset(get())));
    set({ ...persisted });
  },
  finishNow: async () => {
    const current = get();
    if (current.status === 'idle') {
      return;
    }

    const requestId = ++completionRequestId;

    const now = new Date();
    const endedAt = toLocalIsoString(now);
    const nextState = timerEngine.finishNow(current, now);
    set({ ...nextState });
    const persisted = await saveTimerState(stripUpdatedAt(nextState));

    if (requestId !== completionRequestId) {
      return;
    }

    set({ ...persisted });

    if (current.activeMode !== 'focus') {
      return;
    }

    const task = current.selectedTaskId
      ? await getTaskById(current.selectedTaskId)
      : null;
    const sessionInput = buildTrackedFocusSession(current, task, endedAt);

    if (!sessionInput) {
      return;
    }

    const createdSession = await createSession(sessionInput);
    await useSessionsStore.getState().loadSessions();
    await swallowSyncError(syncManager.pushSession(toSessionPushPayload(createdSession)));
    await useSyncStore.getState().loadQueue();
  },
  reconcileWithClock: async () => {
    const current = get();

    if (!isTimerExpired(current)) {
      return;
    }

    const requestId = ++completionRequestId;

    const completion = timerEngine.complete(current);
    const nextState = completion.nextState;
    set({ ...nextState });

    if (completion.completedMode === 'focus') {
      const task = current.selectedTaskId
        ? await getTaskById(current.selectedTaskId)
        : null;
      const sessionInput = buildCompletedFocusSession(
        current,
        task,
        completion.completedAt,
      );
      const persisted = await saveTimerState(stripUpdatedAt(nextState));
      if (requestId !== completionRequestId) {
        return;
      }

      set({ ...persisted });

      if (!sessionInput) {
        return;
      }

      const createdSession = await createSession(sessionInput);
      await useSessionsStore.getState().loadSessions();
      await swallowSyncError(syncManager.pushSession(toSessionPushPayload(createdSession)));
      await useSyncStore.getState().loadQueue();
      return;
    }

    const persisted = await saveTimerState(stripUpdatedAt(nextState));
    if (requestId !== completionRequestId) {
      return;
    }

    set({ ...persisted });
  },
  handleDeletedTask: async (taskId) => {
    const current = get();
    if (current.selectedTaskId !== taskId) {
      return;
    }

    const persisted = await saveTimerState(
      stripUpdatedAt({
        ...current,
        selectedTaskId: null,
        selectedTagId: GENERAL_TAG_ID,
      }),
    );
    set({ ...persisted });
  },
  handleDeletedTag: async (tagId) => {
    const current = get();
    if (current.selectedTagId !== tagId) {
      return;
    }

    const persisted = await saveTimerState(
      stripUpdatedAt({
        ...current,
        selectedTagId: GENERAL_TAG_ID,
      }),
    );
    set({ ...persisted });
  },
}));
