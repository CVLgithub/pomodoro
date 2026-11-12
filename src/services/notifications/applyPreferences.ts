import { useSettingsStore } from '../../store/settingsStore';
import { useTimerStore } from '../../store/timerStore';
import { NotificationPreferences } from '../../types/notifications';
import { timerEngine } from '../timer/timerEngine';
import { notificationService } from './notificationService';

export type ApplyPreferencesResult = 'saved' | 'permission-denied';

const needsPermission = (preferences: NotificationPreferences): boolean =>
  preferences.notifyOnFocusEnd ||
  preferences.notifyOnBreakEnd ||
  preferences.dailyFocusGoalHours !== null;

/**
 * Speichert die Benachrichtigungs-Einstellungen. Fragt bei Bedarf die
 * Berechtigung an und passt die Erinnerung eines laufenden Timers an.
 */
export const applyNotificationPreferences = async (
  preferences: NotificationPreferences,
): Promise<ApplyPreferencesResult> => {
  const supported = notificationService.isSupported();
  let granted = supported ? await notificationService.getPermissionStatus() : false;

  if (needsPermission(preferences) && supported && !granted) {
    granted = await notificationService.requestPermission();

    if (!granted) {
      return 'permission-denied';
    }
  }

  await useSettingsStore.getState().saveNotificationPreferences(preferences);

  const timer = useTimerStore.getState();
  const notifyCurrentMode =
    timer.status === 'running' &&
    granted &&
    (timer.activeMode === 'focus' ? preferences.notifyOnFocusEnd : preferences.notifyOnBreakEnd);

  if (notifyCurrentMode) {
    await notificationService.scheduleTimerCompletionNotification(
      timer.activeMode,
      timerEngine.getRemainingSeconds(timer),
    );
  } else {
    await notificationService.cancelTimerCompletionNotification();
  }

  return 'saved';
};
