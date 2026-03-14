import { TimerDurations } from '../types/timer';

export const DEFAULT_BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL?.trim() || 'http://localhost:3000';
export const BACKEND_URL = DEFAULT_BACKEND_URL;

export const DATABASE_NAME = 'pomodoro.db';
export const GENERAL_TAG_ID = '00000000-0000-4000-8000-000000000001';
export const GENERAL_TAG_NAME = 'Allgemein';
export const FREE_SESSION_TITLE = 'Freie Session';

export const DEFAULT_TIMER_DURATIONS: TimerDurations = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
};

export const FOCUS_CYCLE_LENGTH = 4;
