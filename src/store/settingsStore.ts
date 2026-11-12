import { create } from 'zustand';

import { DEFAULT_AUTO_SWITCH_TO_BREAKS, DEFAULT_BACKEND_URL } from '../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { NotificationPreferences } from '../types/notifications';
import { DEFAULT_START_PAGE, StartPage } from '../types/settings';
import {
  getNotificationPreferences,
  getLastSyncStatus,
  getUserIdSetting,
  isDevUserIdSetting,
  getBackendUrlSetting,
  getAutoSwitchToBreaksSetting,
  getStartPageSetting,
  getThemeSetting,
  saveNotificationPreferences,
  saveBackendUrlSetting,
  saveAutoSwitchToBreaksSetting,
  saveStartPageSetting,
  saveThemeSetting,
  saveUserIdSetting,
} from '../db/repositories/settingsRepository';
import { DEFAULT_THEME, ThemeName } from '../theme/palettes';
import { setActiveTheme } from '../theme/runtime';
import { validateAndNormalizeUserId } from '../services/settings/userIdentity';
import { normalizeCustomTagGroupName } from '../utils/tagGroups';
import { TagGroup } from '../types/tagGroup';
import {
  createTagGroup as createTagGroupRecord,
  deleteTagGroup as deleteTagGroupRecord,
  listTagGroups,
} from '../db/repositories/tagGroupsRepository';
import { getTagById } from '../db/repositories/tagsRepository';
import { syncManager } from '../services/sync/syncManager';
import { toTagPushPayload } from '../services/sync/payloads';

interface SettingsStoreState {
  backendUrl: string;
  userId: string | null;
  isDevUserId: boolean;
  lastSyncSuccessfulAt: string | null;
  lastSyncError: string | null;
  notificationPreferences: NotificationPreferences;
  autoSwitchToBreaks: boolean;
  startPage: StartPage;
  theme: ThemeName;
  tagGroups: TagGroup[];
  isHydrated: boolean;
  loadSettings: () => Promise<void>;
  saveBackendUrl: (value: string) => Promise<void>;
  saveNotificationPreferences: (value: NotificationPreferences) => Promise<void>;
  saveAutoSwitchToBreaks: (value: boolean) => Promise<void>;
  saveStartPage: (value: StartPage) => Promise<void>;
  saveTheme: (value: ThemeName) => Promise<void>;
  saveUserId: (value: string) => Promise<string>;
  createTagGroup: (value: string) => Promise<TagGroup>;
  deleteTagGroup: (groupId: string) => Promise<void>;
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
  userId: null,
  isDevUserId: false,
  lastSyncSuccessfulAt: null,
  lastSyncError: null,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
  autoSwitchToBreaks: DEFAULT_AUTO_SWITCH_TO_BREAKS,
  startPage: DEFAULT_START_PAGE,
  theme: DEFAULT_THEME,
  tagGroups: [],
  isHydrated: false,
  loadSettings: async () => {
    const backendUrl = normalizeBackendUrl(await getBackendUrlSetting());
    const [
      notificationPreferences,
      autoSwitchToBreaks,
      groups,
      startPage,
      userId,
      devUserId,
      syncStatus,
      theme,
    ] = await Promise.all([
      getNotificationPreferences(),
      getAutoSwitchToBreaksSetting(),
      listTagGroups(),
      getStartPageSetting(),
      getUserIdSetting(),
      isDevUserIdSetting(),
      getLastSyncStatus(),
      getThemeSetting(),
    ]);
    setActiveTheme(theme);
    set({
      theme,
      backendUrl,
      userId,
      isDevUserId: devUserId,
      notificationPreferences,
      autoSwitchToBreaks,
      tagGroups: groups,
      startPage,
      lastSyncSuccessfulAt: syncStatus.successfulAt,
      lastSyncError: syncStatus.error,
      isHydrated: true,
    });
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
  saveStartPage: async (value) => {
    const startPage = await saveStartPageSetting(value);
    set({ startPage, isHydrated: true });
  },
  saveTheme: async (value) => {
    const theme = await saveThemeSetting(value);
    setActiveTheme(theme);
    set({ theme, isHydrated: true });
  },
  saveUserId: async (value) => {
    const normalized = validateAndNormalizeUserId(value);
    await saveUserIdSetting(normalized);
    set({ userId: normalized, isDevUserId: false, isHydrated: true });
    return normalized;
  },
  createTagGroup: async (value) => {
    const groupName = normalizeCustomTagGroupName(value);

    if (!groupName) {
      throw new Error('Gruppenname ist erforderlich');
    }

    const existingGroups = get().tagGroups;
    const alreadyExists = existingGroups.some(
      (existingGroup) =>
        existingGroup.name.localeCompare(groupName, 'de-DE', { sensitivity: 'base' }) === 0,
    );

    if (alreadyExists) {
      throw new Error('Diese Gruppe existiert bereits');
    }

    const group = await createTagGroupRecord(groupName);
    await syncManager.pushTagGroup(group);
    const tagGroups = [...existingGroups, group];
    set({ tagGroups, isHydrated: true });

    return group;
  },
  deleteTagGroup: async (groupId) => {
    const group = get().tagGroups.find((entry) => entry.id === groupId);

    if (!group) {
      throw new Error('Tag-Gruppe nicht gefunden');
    }

    // Das Repository hängt die Tags der Gruppe auf "Allgemein" um.
    const affectedTagIds = await deleteTagGroupRecord(group.id);
    for (const tagId of affectedTagIds) {
      const tag = await getTagById(tagId);
      if (tag) {
        await syncManager.pushTag(tag.id, toTagPushPayload(tag));
      }
    }

    const deletedAt = new Date().toISOString();
    await syncManager.pushTagGroup({
      ...group,
      isDeleted: true,
      deletedAt,
      updatedAt: deletedAt,
    });
    set({
      tagGroups: get().tagGroups.filter((entry) => entry.id !== group.id),
      isHydrated: true,
    });
  },
}));
