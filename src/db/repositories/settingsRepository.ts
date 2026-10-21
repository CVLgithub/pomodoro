import { DEFAULT_AUTO_SWITCH_TO_BREAKS, DEFAULT_BACKEND_URL } from '../../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../constants/notifications';
import { NotificationPreferences } from '../../types/notifications';
import { DEFAULT_START_PAGE, isStartPage, StartPage } from '../../types/settings';
import { toLocalIsoString } from '../../utils/date';
import { normalizeTagGroupNames } from '../../utils/tagGroups';
import { getDatabase } from '../client';

type SettingRow = {
  value: string;
};

const BACKEND_URL_KEY = 'backendUrl';
const NOTIFY_ON_FOCUS_END_KEY = 'notifyOnFocusEnd';
const NOTIFY_ON_BREAK_END_KEY = 'notifyOnBreakEnd';
const DAILY_FOCUS_GOAL_HOURS_KEY = 'dailyFocusGoalHours';
const DAILY_FOCUS_GOAL_NOTIFIED_DATE_KEY = 'dailyFocusGoalNotifiedDate';
const AUTO_SWITCH_TO_BREAKS_KEY = 'autoSwitchToBreaks';
const TAG_GROUPS_KEY = 'tagGroups';
const START_PAGE_KEY = 'startPage';
const USER_ID_KEY = 'userId';
const LAST_SYNC_SUCCESS_KEY = 'lastSyncSuccess';
const LAST_SYNC_ERROR_KEY = 'lastSyncError';

const parseTagGroupsSetting = (value?: string): string[] => {
  if (!value) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return normalizeTagGroupNames(
      parsedValue.filter((entry): entry is string => typeof entry === 'string'),
    );
  } catch {
    return [];
  }
};

export const getBackendUrlSetting = async (): Promise<string> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    BACKEND_URL_KEY,
  );

  return row?.value?.trim() || DEFAULT_BACKEND_URL;
};

export const getUserIdSetting = async (): Promise<string | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    USER_ID_KEY,
  );
  const persistedValue = row?.value?.trim();
  if (persistedValue) {
    return persistedValue;
  }

  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    return process.env.EXPO_PUBLIC_DEV_USER_ID?.trim() || null;
  }

  return null;
};

export const isDevUserIdSetting = async (): Promise<boolean> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    USER_ID_KEY,
  );
  return !row?.value?.trim() && typeof __DEV__ !== 'undefined' && __DEV__ &&
    Boolean(process.env.EXPO_PUBLIC_DEV_USER_ID?.trim());
};

export const saveUserIdSetting = async (userId: string): Promise<string> => {
  const db = await getDatabase();
  const normalizedValue = userId.trim();
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updatedAt)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;`,
    USER_ID_KEY,
    normalizedValue,
    toLocalIsoString(),
  );
  return normalizedValue;
};

export const getLastSyncStatus = async (): Promise<{
  successfulAt: string | null;
  error: string | null;
}> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings WHERE key IN (?, ?);',
    LAST_SYNC_SUCCESS_KEY,
    LAST_SYNC_ERROR_KEY,
  );
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    successfulAt: values[LAST_SYNC_SUCCESS_KEY] ?? null,
    error: values[LAST_SYNC_ERROR_KEY] ?? null,
  };
};

const saveSetting = async (key: string, value: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO app_settings (key, value, updatedAt) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;`,
    key,
    value,
    toLocalIsoString(),
  );
};

export const saveLastSyncSuccess = async (value: string): Promise<void> => {
  await saveSetting(LAST_SYNC_SUCCESS_KEY, value);
  await saveSetting(LAST_SYNC_ERROR_KEY, '');
};

export const saveLastSyncError = async (value: string): Promise<void> => {
  await saveSetting(LAST_SYNC_ERROR_KEY, value);
};

export const saveBackendUrlSetting = async (value: string): Promise<string> => {
  const db = await getDatabase();
  const normalizedValue = value.trim();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
    `,
    BACKEND_URL_KEY,
    normalizedValue,
    toLocalIsoString(),
  );

  return normalizedValue;
};

export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `
      SELECT key, value
      FROM app_settings
      WHERE key IN (?, ?, ?);
    `,
    NOTIFY_ON_FOCUS_END_KEY,
    NOTIFY_ON_BREAK_END_KEY,
    DAILY_FOCUS_GOAL_HOURS_KEY,
  );

  const settings = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const dailyFocusGoalHoursRaw = settings[DAILY_FOCUS_GOAL_HOURS_KEY];
  const dailyFocusGoalHours =
    dailyFocusGoalHoursRaw && dailyFocusGoalHoursRaw !== 'off'
      ? Number(dailyFocusGoalHoursRaw)
      : null;

  return {
    notifyOnFocusEnd:
      settings[NOTIFY_ON_FOCUS_END_KEY] === undefined
        ? DEFAULT_NOTIFICATION_PREFERENCES.notifyOnFocusEnd
        : settings[NOTIFY_ON_FOCUS_END_KEY] === 'true',
    notifyOnBreakEnd:
      settings[NOTIFY_ON_BREAK_END_KEY] === undefined
        ? DEFAULT_NOTIFICATION_PREFERENCES.notifyOnBreakEnd
        : settings[NOTIFY_ON_BREAK_END_KEY] === 'true',
    dailyFocusGoalHours:
      dailyFocusGoalHours !== null && Number.isFinite(dailyFocusGoalHours)
        ? dailyFocusGoalHours
        : DEFAULT_NOTIFICATION_PREFERENCES.dailyFocusGoalHours,
  };
};

export const getAutoSwitchToBreaksSetting = async (): Promise<boolean> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    AUTO_SWITCH_TO_BREAKS_KEY,
  );

  if (row?.value === undefined) {
    return DEFAULT_AUTO_SWITCH_TO_BREAKS;
  }

  return row.value === 'true';
};

export const saveAutoSwitchToBreaksSetting = async (value: boolean): Promise<boolean> => {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
    `,
    AUTO_SWITCH_TO_BREAKS_KEY,
    value ? 'true' : 'false',
    toLocalIsoString(),
  );

  return value;
};

export const getStartPageSetting = async (): Promise<StartPage> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    START_PAGE_KEY,
  );

  return row?.value && isStartPage(row.value) ? row.value : DEFAULT_START_PAGE;
};

export const saveStartPageSetting = async (value: StartPage): Promise<StartPage> => {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
    `,
    START_PAGE_KEY,
    value,
    toLocalIsoString(),
  );

  return value;
};

export const getTagGroupsSetting = async (): Promise<string[]> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    TAG_GROUPS_KEY,
  );

  return parseTagGroupsSetting(row?.value);
};

export const saveTagGroupsSetting = async (value: string[]): Promise<string[]> => {
  const db = await getDatabase();
  const normalizedGroups = normalizeTagGroupNames(value);

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
    `,
    TAG_GROUPS_KEY,
    JSON.stringify(normalizedGroups),
    toLocalIsoString(),
  );

  return normalizedGroups;
};

export const saveNotificationPreferences = async (
  value: NotificationPreferences,
): Promise<NotificationPreferences> => {
  const db = await getDatabase();
  const now = toLocalIsoString();

  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `
        INSERT INTO app_settings (key, value, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
      `,
      NOTIFY_ON_FOCUS_END_KEY,
      value.notifyOnFocusEnd ? 'true' : 'false',
      now,
    );
    await transaction.runAsync(
      `
        INSERT INTO app_settings (key, value, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
      `,
      NOTIFY_ON_BREAK_END_KEY,
      value.notifyOnBreakEnd ? 'true' : 'false',
      now,
    );
    await transaction.runAsync(
      `
        INSERT INTO app_settings (key, value, updatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
      `,
      DAILY_FOCUS_GOAL_HOURS_KEY,
      value.dailyFocusGoalHours === null ? 'off' : String(value.dailyFocusGoalHours),
      now,
    );
  });

  return value;
};

export const getDailyFocusGoalNotifiedDate = async (): Promise<string | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    DAILY_FOCUS_GOAL_NOTIFIED_DATE_KEY,
  );

  return row?.value ?? null;
};

export const saveDailyFocusGoalNotifiedDate = async (dateKey: string): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO app_settings (key, value, updatedAt)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt;
    `,
    DAILY_FOCUS_GOAL_NOTIFIED_DATE_KEY,
    dateKey,
    toLocalIsoString(),
  );
};
