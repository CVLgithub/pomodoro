import {
  DEFAULT_TIMER_DURATIONS,
  FOCUS_CYCLE_LENGTH,
  GENERAL_TAG_ID,
} from '../../constants/config';
import {
  TimerCompletionResult,
  TimerMode,
  TimerStateRecord,
} from '../../types/timer';
import {
  addSeconds,
  differenceInSeconds,
  toLocalIsoString,
} from '../../utils/date';
import { minutesToSeconds } from '../../utils/duration';

const durationForMode = (state: TimerStateRecord, mode: TimerMode): number => {
  if (mode === 'focus') {
    return minutesToSeconds(state.focusMinutes);
  }

  if (mode === 'shortBreak') {
    return minutesToSeconds(state.shortBreakMinutes);
  }

  return minutesToSeconds(state.longBreakMinutes);
};

export const timerEngine = {
  createDefaultState: (): TimerStateRecord => ({
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
  }),
  getDurationSeconds: durationForMode,
  getRemainingSeconds: (state: TimerStateRecord, now = new Date()): number => {
    if (state.status === 'running' && state.expectedEndAt) {
      return Math.max(0, differenceInSeconds(state.expectedEndAt, now));
    }

    if (state.status === 'paused' && state.pausedRemainingSeconds !== null) {
      return state.pausedRemainingSeconds;
    }

    return durationForMode(state, state.activeMode);
  },
  getElapsedSeconds: (state: TimerStateRecord, now = new Date()): number =>
    Math.max(
      0,
      durationForMode(state, state.activeMode) - timerEngine.getRemainingSeconds(state, now),
    ),
  withMode: (state: TimerStateRecord, activeMode: TimerMode): TimerStateRecord => ({
    ...state,
    activeMode,
    status: 'idle',
    sessionStartedAt: null,
    startedAt: null,
    expectedEndAt: null,
    pausedRemainingSeconds: null,
    updatedAt: toLocalIsoString(),
  }),
  withDurations: (
    state: TimerStateRecord,
    nextDurations: Partial<
      Pick<TimerStateRecord, 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes'>
    >,
  ): TimerStateRecord => ({
    ...state,
    ...nextDurations,
    updatedAt: toLocalIsoString(),
  }),
  start: (state: TimerStateRecord, now = new Date()): TimerStateRecord => {
    const startTime = toLocalIsoString(now);
    const durationSeconds = durationForMode(state, state.activeMode);
    const expectedEndAt = toLocalIsoString(addSeconds(now, durationSeconds));

    return {
      ...state,
      status: 'running',
      sessionStartedAt: state.sessionStartedAt ?? startTime,
      startedAt: startTime,
      expectedEndAt,
      pausedRemainingSeconds: null,
      updatedAt: startTime,
    };
  },
  pause: (state: TimerStateRecord, now = new Date()): TimerStateRecord => ({
    ...state,
    status: 'paused',
    startedAt: null,
    expectedEndAt: null,
    pausedRemainingSeconds: timerEngine.getRemainingSeconds(state, now),
    updatedAt: toLocalIsoString(now),
  }),
  resume: (state: TimerStateRecord, now = new Date()): TimerStateRecord => {
    const remainingSeconds =
      state.pausedRemainingSeconds ?? durationForMode(state, state.activeMode);
    const startedAt = toLocalIsoString(now);

    return {
      ...state,
      status: 'running',
      startedAt,
      expectedEndAt: toLocalIsoString(addSeconds(now, remainingSeconds)),
      pausedRemainingSeconds: null,
      updatedAt: startedAt,
    };
  },
  reset: (state: TimerStateRecord): TimerStateRecord => ({
    ...state,
    status: 'idle',
    sessionStartedAt: null,
    startedAt: null,
    expectedEndAt: null,
    pausedRemainingSeconds: null,
    updatedAt: toLocalIsoString(),
  }),
  finishNow: (state: TimerStateRecord, now = new Date()): TimerStateRecord => ({
    ...state,
    status: 'idle',
    sessionStartedAt: null,
    startedAt: null,
    expectedEndAt: null,
    pausedRemainingSeconds: null,
    updatedAt: toLocalIsoString(now),
  }),
  complete: (
    state: TimerStateRecord,
    completedAt = new Date(),
  ): TimerCompletionResult => {
    const completedAtIso = state.expectedEndAt ?? toLocalIsoString(completedAt);
    const isFocus = state.activeMode === 'focus';
    const completedFocusCount = isFocus
      ? (state.completedFocusCountInCycle + 1) % FOCUS_CYCLE_LENGTH
      : state.completedFocusCountInCycle;
    const nextMode: TimerMode = isFocus
      ? completedFocusCount === 0
        ? 'longBreak'
        : 'shortBreak'
      : 'focus';

    return {
      completedMode: state.activeMode,
      completedAt: completedAtIso,
      nextState: {
        ...state,
        activeMode: nextMode,
        status: 'idle',
        sessionStartedAt: null,
        startedAt: null,
        expectedEndAt: null,
        pausedRemainingSeconds: null,
        completedFocusCountInCycle: completedFocusCount,
        updatedAt: completedAtIso,
      },
    };
  },
};
