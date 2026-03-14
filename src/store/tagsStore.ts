import { create } from 'zustand';

import { GENERAL_TAG_ID } from '../constants/config';
import {
  DeleteTagResult,
  createTag as createTagRecord,
  deleteTag as deleteTagRecord,
  listTags,
  updateTag as updateTagRecord,
} from '../db/repositories/tagsRepository';
import { getSessionById } from '../db/repositories/sessionsRepository';
import { getTaskById } from '../db/repositories/tasksRepository';
import { syncManager } from '../services/sync/syncManager';
import {
  createTagDeletePayload,
  toSessionPushPayload,
  toTagPushPayload,
  toTaskPushPayload,
} from '../services/sync/payloads';
import { CreateTagInput, Tag, UpdateTagInput } from '../types/tag';
import { useSessionsStore } from './sessionsStore';
import { useSyncStore } from './syncStore';
import { useTasksStore } from './tasksStore';
import { useTimerStore } from './timerStore';

interface TagsStoreState {
  tags: Tag[];
  isLoading: boolean;
  loadTags: () => Promise<void>;
  createTag: (input: CreateTagInput) => Promise<Tag>;
  updateTag: (id: string, input: UpdateTagInput) => Promise<Tag>;
  deleteTag: (id: string) => Promise<void>;
}

const swallowSyncError = async (work: Promise<void>): Promise<void> => {
  try {
    await work;
  } catch {
    // Sync failures are captured by the queue.
  }
};

const syncReassignedEntities = async (result: DeleteTagResult): Promise<void> => {
  for (const taskId of result.reassignedTaskIds) {
    const task = await getTaskById(taskId);
    if (task) {
      await swallowSyncError(syncManager.pushTask(task.id, toTaskPushPayload(task)));
    }
  }

  for (const sessionId of result.reassignedSessionIds) {
    const session = await getSessionById(sessionId);
    if (session) {
      await swallowSyncError(syncManager.pushSession(toSessionPushPayload(session)));
    }
  }
};

export const useTagsStore = create<TagsStoreState>((set, get) => ({
  tags: [],
  isLoading: false,
  loadTags: async () => {
    set({ isLoading: true });

    try {
      const tags = await listTags();
      set({ tags });
    } finally {
      set({ isLoading: false });
    }
  },
  createTag: async (input) => {
    if (!input.name.trim()) {
      throw new Error('Name is required');
    }

    const tag = await createTagRecord(input);
    await get().loadTags();
    await swallowSyncError(syncManager.pushTag(tag.id, toTagPushPayload(tag)));
    await useSyncStore.getState().loadQueue();
    return tag;
  },
  updateTag: async (id, input) => {
    if (input.name !== undefined && !input.name.trim()) {
      throw new Error('Name is required');
    }

    const tag = await updateTagRecord(id, input);
    await get().loadTags();
    await swallowSyncError(syncManager.pushTag(tag.id, toTagPushPayload(tag)));
    await useSyncStore.getState().loadQueue();
    return tag;
  },
  deleteTag: async (id) => {
    if (id === GENERAL_TAG_ID) {
      throw new Error('Allgemein cannot be deleted');
    }

    const result = await deleteTagRecord(id);
    await Promise.all([
      get().loadTags(),
      useTasksStore.getState().loadTasks(),
      useSessionsStore.getState().loadSessions(),
      useTimerStore.getState().handleDeletedTag(id),
    ]);

    await swallowSyncError(syncManager.pushTag(id, createTagDeletePayload(id)));
    await syncReassignedEntities(result);
    await useSyncStore.getState().loadQueue();
  },
}));
