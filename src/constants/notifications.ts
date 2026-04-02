import { NotificationPreferences } from '../types/notifications';

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  notifyOnFocusEnd: true,
  notifyOnBreakEnd: true,
  dailyFocusGoalHours: null,
};

export const DAILY_FOCUS_GOAL_OPTIONS = [1, 2, 4, 6] as const;
