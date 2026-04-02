export interface NotificationPreferences {
  notifyOnFocusEnd: boolean;
  notifyOnBreakEnd: boolean;
  dailyFocusGoalHours: number | null;
}

export interface NotificationCapability {
  isSupported: boolean;
  isPermissionGranted: boolean;
}
