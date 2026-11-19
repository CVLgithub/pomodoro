import { FOCUS_CYCLE_LENGTH } from '../constants/config';
import { TimerMode } from '../types/timer';

/**
 * Runde, die die Rundenanzeige zeigt. Im Fokus ist es die laufende Runde; in
 * einer Pause die gerade abgeschlossene. Nach der letzten Fokus-Session des
 * Zyklus springt der Zähler auf 0, die lange Pause gehört aber noch zur
 * vollen Runde.
 */
export const getCycleRound = (
  mode: TimerMode,
  completedFocusCountInCycle: number,
  cycleLength = FOCUS_CYCLE_LENGTH,
): number => {
  const completed = Math.max(0, Math.min(completedFocusCountInCycle, cycleLength));

  if (mode === 'focus') {
    return Math.min(completed + 1, cycleLength);
  }

  if (mode === 'longBreak' && completed === 0) {
    return cycleLength;
  }

  return Math.max(1, completed);
};
