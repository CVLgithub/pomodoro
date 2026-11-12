import { saveLastSyncError, saveLastSyncSuccess } from '../../db/repositories/settingsRepository';
import { useSessionsStore } from '../../store/sessionsStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useSyncStore } from '../../store/syncStore';
import { useTagsStore } from '../../store/tagsStore';
import { useTasksStore } from '../../store/tasksStore';
import { downsyncEntries } from './downsyncService';

export type FullSyncResult = { ok: true } | { ok: false; message: string };

/** Lädt alle Stores neu aus der lokalen Datenbank. */
export const reloadStores = async (): Promise<void> => {
  await Promise.all([
    useSettingsStore.getState().loadSettings(),
    useTagsStore.getState().loadTags(),
    useTasksStore.getState().loadTasks(),
    useSessionsStore.getState().loadSessions(),
    useSyncStore.getState().loadQueue(),
  ]);
};

/**
 * Gleicht mit dem Backend ab, merkt sich Erfolg oder Fehler und lädt danach
 * die Stores neu. Wirft nicht: Offline zu sein ist ein normaler Zustand.
 */
export const syncAndReload = async (): Promise<FullSyncResult> => {
  let result: FullSyncResult;

  try {
    await downsyncEntries();
    await saveLastSyncSuccess(new Date().toISOString());
    result = { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await saveLastSyncError(message);
    result = { ok: false, message };
  }

  await reloadStores();
  return result;
};
