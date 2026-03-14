import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useSessionsStore } from '../store/sessionsStore';
import { useTasksStore } from '../store/tasksStore';
import { useTimerStore } from '../store/timerStore';
import { getTodayDateKey } from '../utils/date';

export const useTodayData = () => {
  const tasks = useTasksStore((state) => state.tasks);
  const sessions = useSessionsStore((state) => state.sessions);
  const timer = useTimerStore(useShallow((state) => ({
    activeMode: state.activeMode,
    status: state.status,
    selectedTaskId: state.selectedTaskId,
    selectedTagId: state.selectedTagId,
  })));

  return useMemo(() => {
    const todayKey = getTodayDateKey();
    const todaysTasks = tasks.filter((task) => task.date === todayKey);
    const todaysSessions = sessions.filter((session) => session.date === todayKey);
    const focusMinutesToday = todaysSessions.reduce(
      (total, session) => total + session.durationMinutes,
      0,
    );

    return {
      todayKey,
      todaysTasks,
      todaysSessions,
      focusMinutesToday,
      activeTimer: timer,
    };
  }, [sessions, tasks, timer]);
};
