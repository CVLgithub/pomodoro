import { GENERAL_TAG_ID } from '../../constants/config';
import { StopwatchStateRecord } from '../../types/stopwatch';
import { getDatabase } from '../client';

const createDefaultStopwatchState = (): StopwatchStateRecord => ({
  id: 'default',
  status: 'idle',
  phase: 'active',
  sessionStartedAt: null,
  phaseStartedAt: null,
  activeElapsedSeconds: 0,
  breakElapsedSeconds: 0,
  selectedTaskId: null,
  selectedTagId: GENERAL_TAG_ID,
});

export const getStopwatchState = async (): Promise<StopwatchStateRecord> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<StopwatchStateRecord>(
    `
      SELECT
        id,
        status,
        phase,
        sessionStartedAt,
        phaseStartedAt,
        activeElapsedSeconds,
        breakElapsedSeconds,
        selectedTaskId,
        selectedTagId
      FROM stopwatch_state
      WHERE id = 'default';
    `,
  );

  return row ?? createDefaultStopwatchState();
};

export const saveStopwatchState = async (
  state: StopwatchStateRecord,
): Promise<StopwatchStateRecord> => {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT OR REPLACE INTO stopwatch_state (
        id,
        status,
        phase,
        sessionStartedAt,
        phaseStartedAt,
        activeElapsedSeconds,
        breakElapsedSeconds,
        selectedTaskId,
        selectedTagId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    state.id,
    state.status,
    state.phase,
    state.sessionStartedAt,
    state.phaseStartedAt,
    state.activeElapsedSeconds,
    state.breakElapsedSeconds,
    state.selectedTaskId,
    state.selectedTagId,
  );

  return state;
};