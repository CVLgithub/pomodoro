import * as SQLite from 'expo-sqlite';

import { DEFAULT_BACKEND_URL } from '../constants/config';
import { toLocalIsoString } from '../utils/date';
import { buildSchemaStatements } from './schema';

type UserVersionRow = {
  user_version: number;
};

const migrations = [
  {
    version: 1,
    statements: buildSchemaStatements,
  },
  {
    version: 2,
    statements: () => {
      const now = toLocalIsoString();

      return [
        `
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          );
        `,
        `
          INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
          VALUES ('backendUrl', '${DEFAULT_BACKEND_URL}', '${now}');
        `,
      ];
    },
  },
] as const;

export const runMigrations = async (db: SQLite.SQLiteDatabase): Promise<void> => {
  const row = await db.getFirstAsync<UserVersionRow>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  for (const migration of migrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    await db.execAsync('BEGIN IMMEDIATE TRANSACTION;');

    try {
      for (const statement of migration.statements()) {
        await db.execAsync(statement);
      }

      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
};
