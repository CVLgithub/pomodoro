import { create } from 'zustand';

import { listSyncQueueItems } from '../db/repositories/syncQueueRepository';
import { SyncQueueItem } from '../types/sync';
import { syncManager } from '../services/sync/syncManager';

interface SyncStoreState {
  items: SyncQueueItem[];
  isLoading: boolean;
  loadQueue: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  retryAll: () => Promise<void>;
}

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  items: [],
  isLoading: false,
  loadQueue: async () => {
    set({ isLoading: true });

    try {
      const items = await listSyncQueueItems();
      set({ items });
    } finally {
      set({ isLoading: false });
    }
  },
  retryItem: async (id) => {
    try {
      await syncManager.retryQueueItem(id);
    } finally {
      await get().loadQueue();
    }
  },
  retryAll: async () => {
    try {
      await syncManager.retryAllFailed();
    } finally {
      await get().loadQueue();
    }
  },
}));
