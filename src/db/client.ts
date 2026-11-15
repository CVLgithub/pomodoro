import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '../constants/config';
import { LATEST_MIGRATION_VERSION, runMigrations } from './migrations';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let appliedMigrationVersion = 0;

const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  appliedMigrationVersion = LATEST_MIGRATION_VERSION;
  return db;
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  const db = await databasePromise;
  if (appliedMigrationVersion < LATEST_MIGRATION_VERSION) {
    await runMigrations(db);
    appliedMigrationVersion = LATEST_MIGRATION_VERSION;
  }

  return db;
};

export const initializeDatabase = async (): Promise<void> => {
  await getDatabase();
};

