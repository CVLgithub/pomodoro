import { Platform } from 'react-native';

import { TimerMode } from '../../types/timer';

type ScheduledNotificationRequest = {
  identifier: string;
  content: {
    title?: string | null;
    data?: Record<string, unknown>;
  };
};

type ExpoNotificationsModule = {
  AndroidNotificationPriority?: {
    HIGH: string;
  };
  getAllScheduledNotificationsAsync?: () => Promise<ScheduledNotificationRequest[]>;
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
    identifier?: string;
    content: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
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

const TIMER_COMPLETION_NOTIFICATION_IDENTIFIER = 'timer-completion';
const TIMER_COMPLETION_NOTIFICATION_KIND = 'timer-completion';
const TIMER_COMPLETION_NOTIFICATION_TITLES = new Set([
  'Session beendet',
  'Pause beendet',
]);

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
      lightColor: '#FF6B4A',
    });
  }

  isConfigured = true;
  return notifications;
};

const getTimerNotificationContent = (mode: TimerMode) => {
  if (mode === 'focus') {
    return {
      title: 'Session beendet',
      body: 'Zeit f\u00fcr eine Pause.',
    };
  }

  return {
    title: 'Pause beendet',
    body: 'Du kannst mit der n\u00e4chsten Session starten.',
  };
};

const isTimerCompletionNotification = (request: ScheduledNotificationRequest): boolean => {
  if (request.identifier === TIMER_COMPLETION_NOTIFICATION_IDENTIFIER) {
    return true;
  }

  if (request.content.data?.kind === TIMER_COMPLETION_NOTIFICATION_KIND) {
    return true;
  }

  return request.content.title ? TIMER_COMPLETION_NOTIFICATION_TITLES.has(request.content.title) : false;
};

const cancelKnownTimerCompletionNotifications = async (
  notifications: ExpoNotificationsModule,
): Promise<void> => {
  const identifiersToCancel = new Set<string>();

  if (scheduledTimerNotificationId) {
    identifiersToCancel.add(scheduledTimerNotificationId);
  }

  identifiersToCancel.add(TIMER_COMPLETION_NOTIFICATION_IDENTIFIER);

  const scheduledNotifications = await notifications.getAllScheduledNotificationsAsync?.();

  scheduledNotifications
    ?.filter(isTimerCompletionNotification)
    .forEach((request) => identifiersToCancel.add(request.identifier));

  for (const identifier of identifiersToCancel) {
    await notifications.cancelScheduledNotificationAsync(identifier);
  }

  scheduledTimerNotificationId = null;
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

    await cancelKnownTimerCompletionNotifications(notifications);

    const content = getTimerNotificationContent(mode);
    scheduledTimerNotificationId = await notifications.scheduleNotificationAsync({
      identifier: TIMER_COMPLETION_NOTIFICATION_IDENTIFIER,
      content: {
        ...content,
        data: {
          kind: TIMER_COMPLETION_NOTIFICATION_KIND,
        },
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

    await cancelKnownTimerCompletionNotifications(notifications);
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
