import { DEFAULT_AUTO_SWITCH_TO_BREAKS, DEFAULT_BACKEND_URL } from '../../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../../constants/notifications';
import { NotificationPreferences } from '../../types/notifications';
import { toLocalIsoString } from '../../utils/date';
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

export const getBackendUrlSetting = async (): Promise<string> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SettingRow>(
    'SELECT value FROM app_settings WHERE key = ?;',
    BACKEND_URL_KEY,
  );

  return row?.value?.trim() || DEFAULT_BACKEND_URL;
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
