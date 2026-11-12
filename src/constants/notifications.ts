import { NotificationPreferences } from '../types/notifications';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notifyOnFocusEnd: true,
  notifyOnBreakEnd: true,
  dailyFocusGoalHours: null,
};

/** Bereich des Tagesziel-Reglers; 0 Stunden heißt „aus“. */
export const DAILY_FOCUS_GOAL_MAX_HOURS = 10;
export const DAILY_FOCUS_GOAL_STEP_HOURS = 0.5;
