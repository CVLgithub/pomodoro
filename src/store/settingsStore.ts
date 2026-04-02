import { create } from 'zustand';

import { DEFAULT_AUTO_SWITCH_TO_BREAKS, DEFAULT_BACKEND_URL } from '../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { NotificationPreferences } from '../types/notifications';
import {
  getNotificationPreferences,
  getBackendUrlSetting,
  getAutoSwitchToBreaksSetting,
  saveNotificationPreferences,
  saveBackendUrlSetting,
  saveAutoSwitchToBreaksSetting,
} from '../db/repositories/settingsRepository';

interface SettingsStoreState {
  backendUrl: string;
  notificationPreferences: NotificationPreferences;
  autoSwitchToBreaks: boolean;
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  saveBackendUrl: (value: string) => Promise<void>;
  saveNotificationPreferences: (value: NotificationPreferences) => Promise<void>;
  saveAutoSwitchToBreaks: (value: boolean) => Promise<void>;
}

const normalizeBackendUrl = (value: string): string => value.trim().replace(/\/+$/, '');

const assertValidBackendUrl = (value: string): string => {
  const normalizedValue = normalizeBackendUrl(value);

  if (!normalizedValue) {
    throw new Error('Backend-URL darf nicht leer sein');
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedValue);
  } catch {
    throw new Error('Backend-URL muss eine vollständige http(s)-URL sein');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Backend-URL muss mit http:// oder https:// beginnen');
  }

  return normalizedValue;
};

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  backendUrl: normalizeBackendUrl(DEFAULT_BACKEND_URL),
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  autoSwitchToBreaks: DEFAULT_AUTO_SWITCH_TO_BREAKS,
  isHydrated: false,
  loadSettings: async () => {
    const backendUrl = normalizeBackendUrl(await getBackendUrlSetting());
    const [notificationPreferences, autoSwitchToBreaks] = await Promise.all([
      getNotificationPreferences(),
      getAutoSwitchToBreaksSetting(),
    ]);
    set({ backendUrl, notificationPreferences, autoSwitchToBreaks, isHydrated: true });
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
}));
