import * as SQLite from 'expo-sqlite';

import { DEFAULT_BACKEND_URL } from '../constants/config';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '../constants/notifications';
import { toLocalIsoString } from '../utils/date';
import { buildSchemaStatements } from './schema';

type UserVersionRow = {
  user_version: number;
};

type Migration = {
  version: number;
  statements?: () => string[];
  apply?: (db: SQLite.SQLiteDatabase) => Promise<void>;
};

const migrations: readonly Migration[] = [
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
  {
    version: 3,
    statements: () => {
      const now = toLocalIsoString();

      return [
        `
          INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
          VALUES ('notifyOnFocusEnd', '${String(DEFAULT_NOTIFICATION_PREFERENCES.notifyOnFocusEnd)}', '${now}');
        `,
        `
          INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
          VALUES ('notifyOnBreakEnd', '${String(DEFAULT_NOTIFICATION_PREFERENCES.notifyOnBreakEnd)}', '${now}');
        `,
        `
          INSERT OR IGNORE INTO app_settings (key, value, updatedAt)
          VALUES ('dailyFocusGoalHours', 'off', '${now}');
        `,
      ];
    },
  },
  {
    version: 4,
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
      const hasCompletedAtColumn = columns.some((column) => column.name === 'completedAt');

      if (!hasCompletedAtColumn) {
        await db.execAsync('ALTER TABLE tasks ADD COLUMN completedAt TEXT;');
      }

      await db.execAsync(`
        UPDATE tasks
        SET completedAt = updatedAt
        WHERE isCompleted = 1 AND completedAt IS NULL;
      `);
    },
  },
  {
    version: 5,
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tasks);');
      const hasRecurrenceTypeColumn = columns.some((column) => column.name === 'recurrenceType');
      const hasRecurrenceDaysColumn = columns.some((column) => column.name === 'recurrenceDays');

      if (!hasRecurrenceTypeColumn) {
        await db.execAsync("ALTER TABLE tasks ADD COLUMN recurrenceType TEXT NOT NULL DEFAULT 'none';");
      }

      if (!hasRecurrenceDaysColumn) {
        await db.execAsync("ALTER TABLE tasks ADD COLUMN recurrenceDays TEXT NOT NULL DEFAULT '[]';");
      }

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS task_occurrence_completions (
          taskId TEXT NOT NULL,
          date TEXT NOT NULL,
          completedAt TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          PRIMARY KEY (taskId, date),
          FOREIGN KEY (taskId) REFERENCES tasks (id) ON DELETE CASCADE
        );
      `);
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_task_occurrence_completions_date
        ON task_occurrence_completions (date);
      `);
    },
  },
  {
    version: 6,
    apply: async (db) => {
      const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(tags);');
      const hasGroupNameColumn = columns.some((column) => column.name === 'groupName');

      if (!hasGroupNameColumn) {
        await db.execAsync('ALTER TABLE tags ADD COLUMN groupName TEXT;');
      }
    },
  },
  {
    version: 7,
    statements: () => [
      `
        CREATE TABLE IF NOT EXISTS stopwatch_state (
          id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL,
          phase TEXT NOT NULL,
          sessionStartedAt TEXT,
          phaseStartedAt TEXT,
          activeElapsedSeconds INTEGER NOT NULL DEFAULT 0,
          breakElapsedSeconds INTEGER NOT NULL DEFAULT 0,
          selectedTaskId TEXT,
          selectedTagId TEXT NOT NULL
        );
      `,
    ],
  },
  {
    version: 8,
    apply: async (db) => {
      const now = toLocalIsoString();
      const addColumn = async (table: string, column: string, definition: string) => {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table});`);
        if (!columns.some((entry) => entry.name === column)) {
          await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
        }
      };

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tag_groups (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          isDeleted INTEGER NOT NULL DEFAULT 0,
          deletedAt TEXT
        );
      `);
      await addColumn('tags', 'groupId', 'TEXT');
      await addColumn('tags', 'isDeleted', 'INTEGER NOT NULL DEFAULT 0');
      await addColumn('tags', 'deletedAt', 'TEXT');
      await addColumn('tasks', 'isDeleted', 'INTEGER NOT NULL DEFAULT 0');
      await addColumn('tasks', 'deletedAt', 'TEXT');
      await addColumn('sessions', 'updatedAt', 'TEXT');
      await addColumn('sessions', 'isDeleted', 'INTEGER NOT NULL DEFAULT 0');
      await addColumn('sessions', 'deletedAt', 'TEXT');

      await db.runAsync(
        `INSERT OR IGNORE INTO tag_groups (id, name, createdAt, updatedAt)
         VALUES (?, ?, ?, ?);`,
        '00000000-0000-4000-8000-000000000002',
        'Allgemein',
        now,
        now,
      );
      await db.runAsync(
        `UPDATE tags SET groupId = ? WHERE groupId IS NULL
         AND (groupName IS NULL OR TRIM(groupName) = '' OR LOWER(groupName) = LOWER(?));`,
        '00000000-0000-4000-8000-000000000002',
        'Allgemein',
      );
      await db.runAsync(
        `UPDATE sessions SET updatedAt = COALESCE(updatedAt, createdAt, ?);`,
        now,
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO app_settings (key, value, updatedAt) VALUES ('userId', '', ?);`,
        now,
      );
      await db.runAsync(
        `DELETE FROM sync_queue WHERE entityType = 'tagGroups' OR endpoint = '/push/tag-groups';`,
      );
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
      if (migration.apply) {
        await migration.apply(db);
      } else {
        for (const statement of migration.statements?.() ?? []) {
          await db.execAsync(statement);
        }
      }

      await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      await db.execAsync('COMMIT;');
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }
};
