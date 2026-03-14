import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useAppResume = (onResume: () => void | Promise<void>): void => {
  useEffect(() => {
    let previousState = AppState.currentState;

    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        const wasBackgrounded =
          previousState === 'background' || previousState === 'inactive';
        const isForeground = nextState === 'active';

        if (wasBackgrounded && isForeground) {
          void onResume();
        }

        previousState = nextState;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [onResume]);
};

