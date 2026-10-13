import { create } from 'zustand';

import { DEFAULT_AUTO_SWITCH_TO_BREAKS, DEFAULT_BACKEND_URL } from '../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { NotificationPreferences } from '../types/notifications';
import { syncManager } from '../services/sync/syncManager';
import { toTagGroupsPushPayload } from '../services/sync/payloads';
import { useSyncStore } from './syncStore';
import {
  getNotificationPreferences,
  getBackendUrlSetting,
  getAutoSwitchToBreaksSetting,
  getTagGroupsSetting,
  saveNotificationPreferences,
  saveBackendUrlSetting,
  saveAutoSwitchToBreaksSetting,
  saveTagGroupsSetting,
} from '../db/repositories/settingsRepository';
import { normalizeCustomTagGroupName } from '../utils/tagGroups';

interface SettingsStoreState {
  backendUrl: string;
  notificationPreferences: NotificationPreferences;
  autoSwitchToBreaks: boolean;
  tagGroups: string[];
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  saveBackendUrl: (value: string) => Promise<void>;
  saveNotificationPreferences: (value: NotificationPreferences) => Promise<void>;
  saveAutoSwitchToBreaks: (value: boolean) => Promise<void>;
  createTagGroup: (value: string) => Promise<string>;
  deleteTagGroup: (value: string) => Promise<void>;
}

const normalizeBackendUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const assertValidBackendUrl = (value: string): string => {
  const normalizedValue = normalizeBackendUrl(value);

  if (!normalizedValue) {
    throw new Error('Adresse darf nicht leer sein');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error('Adresse muss eine vollständige http(s)-URL sein');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Adresse muss mit http:// oder https:// beginnen');
  }

  return normalizedValue;
};

export const useSettingsStore = create<SettingsStoreState>((set, get) => ({
  backendUrl: normalizeBackendUrl(DEFAULT_BACKEND_URL),
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  autoSwitchToBreaks: DEFAULT_AUTO_SWITCH_TO_BREAKS,
  tagGroups: [],
  isHydrated: false,
  loadSettings: async () => {
    const backendUrl = normalizeBackendUrl(await getBackendUrlSetting());
    const [notificationPreferences, autoSwitchToBreaks, tagGroups] = await Promise.all([
      getNotificationPreferences(),
      getAutoSwitchToBreaksSetting(),
      getTagGroupsSetting(),
    ]);
    set({ backendUrl, notificationPreferences, autoSwitchToBreaks, tagGroups, isHydrated: true });
  },
  saveBackendUrl: async (value) => {
    const backendUrl = assertValidBackendUrl(value);
    const persistedUrl = normalizeBackendUrl(await saveBackendUrlSetting(backendUrl));
    set({ backendUrl: persistedUrl, isHydrated: true });
  },
  saveNotificationPreferences: async (value) => {
    const notificationPreferences = await saveNotificationPreferences(value);
    set({ notificationPreferences, isHydrated: true });
  },
  saveAutoSwitchToBreaks: async (value) => {
    const autoSwitchToBreaks = await saveAutoSwitchToBreaksSetting(value);
    set({ autoSwitchToBreaks, isHydrated: true });
  },
  createTagGroup: async (value) => {
    const groupName = normalizeCustomTagGroupName(value);

    if (!groupName) {
      throw new Error('Gruppenname ist erforderlich');
    }

    const existingGroups = get().tagGroups;
    const alreadyExists = existingGroups.some(
      (existingGroup) =>
        existingGroup.localeCompare(groupName, 'de-DE', { sensitivity: 'base' }) === 0,
    );

    if (alreadyExists) {
      throw new Error('Diese Gruppe existiert bereits');
    }

    const tagGroups = await saveTagGroupsSetting([...existingGroups, groupName]);
    set({ tagGroups, isHydrated: true });

    return groupName;
  },
  deleteTagGroup: async (value) => {
    const groupName = normalizeCustomTagGroupName(value);

    if (!groupName) {
      throw new Error('Ungültige Tag-Gruppe');
    }

    const existingGroups = get().tagGroups;
    const tagGroups = await saveTagGroupsSetting(
      existingGroups.filter(
        (existingGroup) =>
          existingGroup.localeCompare(groupName, 'de-DE', { sensitivity: 'base' }) !== 0,
      ),
    );

    set({ tagGroups, isHydrated: true });

    try {
      await syncManager.pushTagGroups(toTagGroupsPushPayload(tagGroups));
    } catch {
      // Sync failures are captured by the queue.
    } finally {
      await useSyncStore.getState().loadQueue();
    }
  },
}));
