import * as SQLite from 'expo-sqlite';

import { buildSchemaStatements } from './schema';

type UserVersionRow = {
  user_version: number;
};

const migrations = [
  {
    version: 1,
    statements: buildSchemaStatements,
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

