import { DEFAULT_TIMER_DURATIONS, GENERAL_TAG_ID } from '../../constants/config';
import { TimerStateRecord } from '../../types/timer';
import { toLocalIsoString } from '../../utils/date';
import { getDatabase } from '../client';

type TimerStateRow = TimerStateRecord;

const buildDefaultTimerState = (): TimerStateRecord => ({
  id: 'default',
  activeMode: 'focus',
  status: 'idle',
  sessionStartedAt: null,
  startedAt: null,
  expectedEndAt: null,
  pausedRemainingSeconds: null,
  selectedTaskId: null,
  selectedTagId: GENERAL_TAG_ID,
  completedFocusCountInCycle: 0,
  ...DEFAULT_TIMER_DURATIONS,
  updatedAt: toLocalIsoString(),
});

export const getTimerState = async (): Promise<TimerStateRecord> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<TimerStateRow>(
    `
      SELECT
        id,
        activeMode,
        status,
        sessionStartedAt,
        startedAt,
        expectedEndAt,
        pausedRemainingSeconds,
        selectedTaskId,
        selectedTagId,
        completedFocusCountInCycle,
        focusMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        updatedAt
      FROM timer_state
      WHERE id = 'default';
    `,
  );

  return row ?? buildDefaultTimerState();
};

export const saveTimerState = async (
  state: Omit<TimerStateRecord, 'updatedAt'>,
): Promise<TimerStateRecord> => {
  const db = await getDatabase();
  const record: TimerStateRecord = {
    ...state,
    updatedAt: toLocalIsoString(),
  };

  await db.runAsync(
    `
      INSERT OR REPLACE INTO timer_state (
        id,
        activeMode,
        status,
        sessionStartedAt,
        startedAt,
        expectedEndAt,
        pausedRemainingSeconds,
        selectedTaskId,
        selectedTagId,
        completedFocusCountInCycle,
        focusMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        updatedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `,
    record.id,
    record.activeMode,
    record.status,
    record.sessionStartedAt,
    record.startedAt,
    record.expectedEndAt,
    record.pausedRemainingSeconds,
    record.selectedTaskId,
    record.selectedTagId,
    record.completedFocusCountInCycle,
    record.focusMinutes,
    record.shortBreakMinutes,
    record.longBreakMinutes,
    record.updatedAt,
  );

  return record;
};
