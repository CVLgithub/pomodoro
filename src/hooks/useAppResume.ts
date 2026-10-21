import { useEffect } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';

export const useAppResume = (onResume: () => void | Promise<void>): void => {
  useEffect(() => {
    let previousState = AppState.currentState;
    let lastResumeAt = 0;

    const resumeIfDebounced = () => {
      const now = Date.now();
      if (now - lastResumeAt < 30_000) {
        return;
      }
      lastResumeAt = now;
      void onResume();
    };

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const wasBackgrounded =
          previousState === 'background' || previousState === 'inactive';
        const isForeground = nextState === 'active';

        if (wasBackgrounded && isForeground) {
          resumeIfDebounced();
        }

        previousState = nextState;
      },
    );

    const visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        resumeIfDebounced();
      }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      subscription.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [onResume]);
};
