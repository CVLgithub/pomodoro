import { FREE_SESSION_TITLE } from '../../constants/config';
import { CreateSessionInput } from '../../types/session';
import { Task } from '../../types/task';
import { TimerStateRecord } from '../../types/timer';
import { formatDateKey } from '../../utils/date';
import { timerEngine } from './timerEngine';

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

export const buildCompletedFocusSession = (
  state: TimerStateRecord,
  task: Task | null,
  completedAt: string,
): CreateSessionInput => {
  const startTime = state.sessionStartedAt ?? state.startedAt ?? completedAt;

  return {
    title: task?.title ?? FREE_SESSION_TITLE,
    date: formatDateKey(startTime),
    startTime,
    endTime: completedAt,
    durationMinutes: state.focusMinutes,
    taskId: task?.id ?? null,
    tagId: task?.tagId ?? state.selectedTagId,
    syncStatus: 'pending',
  };
};
