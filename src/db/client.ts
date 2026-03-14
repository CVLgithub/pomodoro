import * as SQLite from 'expo-sqlite';

import { DATABASE_NAME } from '../constants/config';
import { runMigrations } from './migrations';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await runMigrations(db);
  return db;
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = openDatabase();
  }

  return databasePromise;
};

export const initializeDatabase = async (): Promise<void> => {
  await getDatabase();
};
