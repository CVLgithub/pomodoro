import {
  Session,
  CreateSessionInput,
  SessionSyncStatus,
  UpdateSessionAssignmentInput,
  UpdateSessionInput,
} from '../../types/session';
import { toLocalIsoString } from '../../utils/date';
import { createUuid } from '../../utils/uuid';
import { getDatabase } from '../client';
import { deleteSyncQueueItemsByEntity } from './syncQueueRepository';

type SessionRow = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  taskId: string | null;
  tagId: string;
  syncStatus: SessionSyncStatus;
  createdAt: string;
};

const mapSessionRow = (row: SessionRow): Session => ({
  id: row.id,
  title: row.title,
  date: row.date,
  startTime: row.startTime,
  endTime: row.endTime,
  durationMinutes: row.durationMinutes,
  taskId: row.taskId,
  tagId: row.tagId,
  syncStatus: row.syncStatus,
  createdAt: row.createdAt,
});

export const listSessions = async (): Promise<Session[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SessionRow>(
    `
      SELECT id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt
      FROM sessions
      ORDER BY date DESC, startTime DESC;
    `,
  );

  return rows.map(mapSessionRow);
};

export const getSessionById = async (id: string): Promise<Session | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `
      SELECT id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt
      FROM sessions
      WHERE id = ?;
    `,
    id,
  );

  return row ? mapSessionRow(row) : null;
};

export const getLatestSession = async (): Promise<Session | null> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<SessionRow>(
    `
      SELECT id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt
      FROM sessions
      ORDER BY startTime DESC
      LIMIT 1;
    `,
  );

  return row ? mapSessionRow(row) : null;
};

export const createSession = async (input: CreateSessionInput): Promise<Session> => {
  const db = await getDatabase();
  const session: Session = {
    id: createUuid(),
    title: input.title,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    taskId: input.taskId ?? null,
    tagId: input.tagId,
    syncStatus: input.syncStatus ?? 'pending',
    createdAt: toLocalIsoString(),
  };

  await db.runAsync(
    `
      INSERT INTO sessions (
        id, title, date, startTime, endTime, durationMinutes, taskId, tagId, syncStatus, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    session.id,
    session.title,
    session.date,
    session.startTime,
    session.endTime,
    session.durationMinutes,
    session.taskId,
    session.tagId,
    session.syncStatus,
    session.createdAt,
  );

  return session;
};

export const deleteSession = async (id: string): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM sessions WHERE id = ?;', id);
  await deleteSyncQueueItemsByEntity('session', id);
};

export const updateSessionAssignment = async (
  id: string,
  input: UpdateSessionAssignmentInput,
): Promise<Session> => {
  const db = await getDatabase();
  const existingSession = await getSessionById(id);

  if (!existingSession) {
    throw new Error('Session not found');
  }

  const updatedSession: Session = {
    ...existingSession,
    taskId: input.taskId,
    title: input.title,
    tagId: input.tagId,
    syncStatus: 'pending',
  };

  await db.runAsync(
    `
      UPDATE sessions
      SET taskId = ?, title = ?, tagId = ?, syncStatus = ?
      WHERE id = ?;
    `,
    updatedSession.taskId,
    updatedSession.title,
    updatedSession.tagId,
    updatedSession.syncStatus,
    updatedSession.id,
  );

  return updatedSession;
};

export const updateSession = async (
  id: string,
  input: UpdateSessionInput,
): Promise<Session> => {
  const db = await getDatabase();
  const existingSession = await getSessionById(id);

  if (!existingSession) {
    throw new Error('Session not found');
  }

  const updatedSession: Session = {
    ...existingSession,
    title: input.title.trim(),
    tagId: input.tagId,
    syncStatus: 'pending',
  };

  await db.runAsync(
    `
      UPDATE sessions
      SET title = ?, tagId = ?, syncStatus = ?
      WHERE id = ?;
    `,
    updatedSession.title,
    updatedSession.tagId,
    updatedSession.syncStatus,
    updatedSession.id,
  );

  return updatedSession;
};

export const updateSessionSyncStatus = async (
  id: string,
  syncStatus: SessionSyncStatus,
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('UPDATE sessions SET syncStatus = ? WHERE id = ?;', syncStatus, id);
};
