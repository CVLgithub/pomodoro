export type TimerMode = 'focus' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerDurations {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
}

export interface TimerStateRecord extends TimerDurations {
  id: string;
  activeMode: TimerMode;
  status: TimerStatus;
  sessionStartedAt: string | null;
  startedAt: string | null;
  expectedEndAt: string | null;
  pausedRemainingSeconds: number | null;
  selectedTaskId: string | null;
  selectedTagId: string;
  completedFocusCountInCycle: number;
  updatedAt: string;
}

export interface TimerCompletionResult {
  nextState: TimerStateRecord;
  completedMode: TimerMode;
  completedAt: string;
}

