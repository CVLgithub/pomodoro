import { create } from 'zustand';

import { GENERAL_TAG_ID } from '../constants/config';
import { listTaskOccurrenceCompletions, setTaskOccurrenceCompletion } from '../db/repositories/taskOccurrenceCompletionsRepository';
import {
  createTask as createTaskRecord,
  deleteTask as deleteTaskRecord,
  listTasks,
  updateTask as updateTaskRecord,
} from '../db/repositories/tasksRepository';
import {
  getSessionById,
  updateSessionAssignment,
} from '../db/repositories/sessionsRepository';
import { syncManager } from '../services/sync/syncManager';
import {
  createTaskDeletePayload,
  toSessionPushPayload,
  toTaskPushPayload,
} from '../services/sync/payloads';
import {
  CreateTaskInput,
  Task,
  TaskOccurrenceCompletion,
  UpdateTaskInput,
} from '../types/task';
import { isTaskRecurring } from '../utils/taskRecurrence';
import { useSessionsStore } from './sessionsStore';
import { useSyncStore } from './syncStore';
import { useTimerStore } from './timerStore';

interface TasksStoreState {
  tasks: Task[];
  occurrenceCompletions: TaskOccurrenceCompletion[];
  isLoading: boolean;
  loadTasks: () => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (
    id: string,
    isCompleted: boolean,
    options?: { date?: string },
  ) => Promise<void>;
}

const swallowSyncError = async (work: Promise<void>): Promise<void> => {
  try {
    await work;
  } catch {
    // Sync failures are captured by the queue.
  }
};

export const useTasksStore = create<TasksStoreState>((set, get) => ({
  tasks: [],
  occurrenceCompletions: [],
  isLoading: false,
  loadTasks: async () => {
    set({ isLoading: true });

    try {
      const [tasks, occurrenceCompletions] = await Promise.all([
        listTasks(),
        listTaskOccurrenceCompletions(),
      ]);
      set({ tasks, occurrenceCompletions });
    } finally {
      set({ isLoading: false });
    }
  },
  createTask: async (input) => {
    if (!input.title.trim()) {
      throw new Error('Title is required');
    }

    const task = await createTaskRecord({
      ...input,
      tagId: input.tagId ?? GENERAL_TAG_ID,
    });
    await get().loadTasks();
    await swallowSyncError(syncManager.pushTask(task.id, toTaskPushPayload(task)));
    await useSyncStore.getState().loadQueue();
    return task;
  },
  updateTask: async (id, input) => {
    if (input.title !== undefined && !input.title.trim()) {
      throw new Error('Title is required');
    }

    const task = await updateTaskRecord(id, input);
    await get().loadTasks();
    await swallowSyncError(syncManager.pushTask(task.id, toTaskPushPayload(task)));
    await useSyncStore.getState().loadQueue();
    return task;
  },
  deleteTask: async (id) => {
    const result = await deleteTaskRecord(id);
    await get().loadTasks();
    await useTimerStore.getState().handleDeletedTask(id);

    for (const sessionId of result.affectedSessionIds) {
      const session = await getSessionById(sessionId);
      if (!session) {
        continue;
      }

      const updatedSession = await updateSessionAssignment(session.id, {
        taskId: null,
        title: session.title,
        tagId: session.tagId,
      });
      await swallowSyncError(syncManager.pushSession(toSessionPushPayload(updatedSession)));
    }

    await useSessionsStore.getState().loadSessions();
    await swallowSyncError(syncManager.pushTask(id, createTaskDeletePayload(id)));
    await useSyncStore.getState().loadQueue();
  },
  toggleTaskCompletion: async (id, isCompleted, options) => {
    const task = get().tasks.find((entry) => entry.id === id);

    if (!task) {
      throw new Error('Task not found');
    }

    if (isTaskRecurring(task)) {
      if (!options?.date) {
        throw new Error('Recurring tasks need a specific date for completion changes.');
      }

      await setTaskOccurrenceCompletion(id, options.date, isCompleted);
      const occurrenceCompletions = await listTaskOccurrenceCompletions();
      set({ occurrenceCompletions });
      return;
    }

    await get().updateTask(id, { isCompleted });
  },
}));
