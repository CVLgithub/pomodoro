import { FREE_SESSION_TITLE } from '../../constants/config';
import { CreateSessionInput } from '../../types/session';
import { Task } from '../../types/task';
import { TimerStateRecord } from '../../types/timer';
import { formatDateKey } from '../../utils/date';
import { timerEngine } from './timerEngine';

export const getTrackedFocusMinutes = (
  state: TimerStateRecord,
  now = new Date(),
): number => Math.floor(timerEngine.getElapsedSeconds(state, now) / 60);

export const isTimerExpired = (
  state: TimerStateRecord,
  now = new Date(),
): boolean => {
  return (
    state.status === 'running' &&
    Boolean(state.expectedEndAt) &&
    timerEngine.getRemainingSeconds(state, now) <= 0
  );
};

const buildFocusSession = (
  state: TimerStateRecord,
  task: Task | null,
  endedAt: string,
  durationMinutes: number,
): CreateSessionInput | null => {
  if (durationMinutes <= 0) {
    return null;
  }

  const startTime = state.sessionStartedAt ?? state.startedAt ?? endedAt;

  return {
    title: task?.title ?? FREE_SESSION_TITLE,
    date: formatDateKey(startTime),
    startTime,
    endTime: endedAt,
    durationMinutes,
    taskId: task?.id ?? null,
    tagId: task?.tagId ?? state.selectedTagId,
    syncStatus: 'pending',
  };
};

export const buildCompletedFocusSession = (
  state: TimerStateRecord,
  task: Task | null,
  completedAt: string,
): CreateSessionInput | null => buildFocusSession(state, task, completedAt, state.focusMinutes);

export const buildTrackedFocusSession = (
  state: TimerStateRecord,
  task: Task | null,
  endedAt: string,
  now = new Date(),
): CreateSessionInput | null =>
  buildFocusSession(state, task, endedAt, getTrackedFocusMinutes(state, now));
