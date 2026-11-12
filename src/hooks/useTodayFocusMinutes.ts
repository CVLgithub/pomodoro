import { useMemo } from 'react';

import { useSessionsStore } from '../store/sessionsStore';
import { getTodayDateKey } from '../utils/date';

/** Summe der heute erfassten Fokusminuten aus Timer und Stoppuhr. */
export const useTodayFocusMinutes = (): number => {
  const sessions = useSessionsStore((state) => state.sessions);

  return useMemo(() => {
    const todayKey = getTodayDateKey();

    return sessions
      .filter((session) => session.date === todayKey)
      .reduce((total, session) => total + session.durationMinutes, 0);
  }, [sessions]);
};
