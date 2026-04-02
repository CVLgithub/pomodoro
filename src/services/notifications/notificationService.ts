import { Platform } from 'react-native';

import { TimerMode } from '../../types/timer';

type ExpoNotificationsModule = {
  AndroidNotificationPriority?: {
    HIGH: string;
  };
  setNotificationHandler?: (handler: {
    handleNotification: () => Promise<{
      shouldShowBanner: boolean;
      shouldShowList: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
    }>;
  }) => void;
  setNotificationChannelAsync?: (
    channelId: string,
    config: {
      name: string;
      importance?: string;
      sound?: string | null;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ) => Promise<void>;
  getPermissionsAsync: () => Promise<{ granted: boolean; ios?: { status?: number } }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean; ios?: { status?: number } }>;
  scheduleNotificationAsync: (request: {
    content: {
      title: string;
      body: string;
      sound?: boolean;
      priority?: string;
    };
    trigger: { type: 'timeInterval'; seconds: number; repeats?: boolean; channelId?: string };
  }) => Promise<string>;
  cancelScheduledNotificationAsync: (identifier: string) => Promise<void>;
};

let cachedModule: ExpoNotificationsModule | null | undefined;
let isConfigured = false;
let scheduledTimerNotificationId: string | null = null;

const getExpoNotificationsModule = (): ExpoNotificationsModule | null => {
  if (cachedModule !== undefined) {
    return cachedModule;
  }

  try {
    // Optional dependency: app remains usable without native notifications installed.
    cachedModule = require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    cachedModule = null;
  }

  return cachedModule;
};

const ensureConfigured = async (): Promise<ExpoNotificationsModule | null> => {
  const notifications = getExpoNotificationsModule();

  if (!notifications || isConfigured) {
    return notifications;
  }

  notifications.setNotificationHandler?.({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await notifications.setNotificationChannelAsync?.('timer', {
      name: 'Timer',
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5EA2FF',
    });
  }

  isConfigured = true;
  return notifications;
};

const getTimerNotificationContent = (mode: TimerMode) => {
  if (mode === 'focus') {
    return {
      title: 'Fokus-Session beendet',
      body: 'Zeit für eine Pause.',
    };
  }

  return {
    title: 'Pause beendet',
    body: 'Du kannst mit der nächsten Fokus-Session starten.',
  };
};

export const notificationService = {
  isSupported: (): boolean => Boolean(getExpoNotificationsModule()),
  getPermissionStatus: async (): Promise<boolean> => {
    const notifications = await ensureConfigured();

    if (!notifications) {
      return false;
    }

    const permissions = await notifications.getPermissionsAsync();
    return Boolean(permissions.granted);
  },
  requestPermission: async (): Promise<boolean> => {
    const notifications = await ensureConfigured();

    if (!notifications) {
      return false;
    }

    const current = await notifications.getPermissionsAsync();
    if (current.granted) {
      return true;
    }

    const requested = await notifications.requestPermissionsAsync();
    return Boolean(requested.granted);
  },
  scheduleTimerCompletionNotification: async (
    mode: TimerMode,
    secondsUntilCompletion: number,
  ): Promise<void> => {
    const notifications = await ensureConfigured();

    if (!notifications || secondsUntilCompletion <= 0) {
      return;
    }

    if (scheduledTimerNotificationId) {
      await notifications.cancelScheduledNotificationAsync(scheduledTimerNotificationId);
      scheduledTimerNotificationId = null;
    }

    const content = getTimerNotificationContent(mode);
    scheduledTimerNotificationId = await notifications.scheduleNotificationAsync({
      content: {
        ...content,
        sound: true,
        priority: notifications.AndroidNotificationPriority?.HIGH,
      },
      trigger: {
        type: 'timeInterval',
        seconds: Math.max(1, Math.round(secondsUntilCompletion)),
        repeats: false,
        channelId: 'timer',
      },
    });
  },
  cancelTimerCompletionNotification: async (): Promise<void> => {
    const notifications = await ensureConfigured();

    if (!notifications) {
      return;
    }

    if (!scheduledTimerNotificationId) {
      return;
    }

    await notifications.cancelScheduledNotificationAsync(scheduledTimerNotificationId);
    scheduledTimerNotificationId = null;
  },
  sendDailyGoalReachedNotification: async (hours: number): Promise<void> => {
    const notifications = await ensureConfigured();

    if (!notifications) {
      return;
    }

    await notifications.scheduleNotificationAsync({
      content: {
        title: 'Tagesziel erreicht',
        body: `Du hast heute ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} fokussiert gearbeitet.`,
        sound: true,
        priority: notifications.AndroidNotificationPriority?.HIGH,
      },
      trigger: {
        type: 'timeInterval',
        seconds: 1,
        repeats: false,
        channelId: 'timer',
      },
    });
  },
};
