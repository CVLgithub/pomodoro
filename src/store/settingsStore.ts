import { create } from 'zustand';

import { DEFAULT_BACKEND_URL } from '../constants/config';
import {
  getBackendUrlSetting,
  saveBackendUrlSetting,
} from '../db/repositories/settingsRepository';

interface SettingsStoreState {
  backendUrl: string;
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  saveBackendUrl: (value: string) => Promise<void>;
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
  isHydrated: false,
  loadSettings: async () => {
    const backendUrl = normalizeBackendUrl(await getBackendUrlSetting());
    set({ backendUrl, isHydrated: true });
  },
  saveBackendUrl: async (value) => {
    const backendUrl = assertValidBackendUrl(value);
    const persistedUrl = normalizeBackendUrl(await saveBackendUrlSetting(backendUrl));
    set({ backendUrl: persistedUrl, isHydrated: true });
  },
}));
