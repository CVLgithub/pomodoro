import { TimerDurations, TimerMode } from '../types/timer';

export interface TimerModeEntry {
  mode: TimerMode;
  label: string;
  /** Feld im Timer-Zustand, das die Dauer dieses Modus in Minuten hält. */
  durationKey: keyof TimerDurations;
}

/** Die drei Modi des Timers in der Reihenfolge, in der sie angeboten werden. */
export const TIMER_MODES: readonly TimerModeEntry[] = [
  { mode: 'focus', label: 'Fokus', durationKey: 'focusMinutes' },
  { mode: 'shortBreak', label: 'Kurze Pause', durationKey: 'shortBreakMinutes' },
  { mode: 'longBreak', label: 'Lange Pause', durationKey: 'longBreakMinutes' },
];

/** Längste einstellbare Dauer eines Modus in Minuten. */
export const MAX_TIMER_MINUTES = 180;
