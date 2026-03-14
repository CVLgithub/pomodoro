import { DEFAULT_BACKEND_URL } from '../../constants/config';
import { toLocalIsoString } from '../../utils/date';
import { getDatabase } from '../client';

type SettingRow = {
  value: string;
};

const BACKEND_URL_KEY = 'backendUrl';

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
