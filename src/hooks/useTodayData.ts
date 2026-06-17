import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useSessionsStore } from '../store/sessionsStore';
import { useTasksStore } from '../store/tasksStore';
import { useTimerStore } from '../store/timerStore';
import { getTodayDateKey } from '../utils/date';
import {
  buildTaskOccurrenceCompletionLookup,
  getResolvedTaskOccurrencesForDate,
} from '../utils/taskRecurrence';

export const useTodayData = () => {
  const tasks = useTasksStore((state) => state.tasks);
  const occurrenceCompletions = useTasksStore((state) => state.occurrenceCompletions);
  const sessions = useSessionsStore((state) => state.sessions);
  const timer = useTimerStore(useShallow((state) => ({
    activeMode: state.activeMode,
    status: state.status,
    selectedTaskId: state.selectedTaskId,
    selectedTagId: state.selectedTagId,
  })));

  return useMemo(() => {
    const todayKey = getTodayDateKey();
    const occurrenceLookup = buildTaskOccurrenceCompletionLookup(occurrenceCompletions);
    const todaysTasks = getResolvedTaskOccurrencesForDate(tasks, todayKey, occurrenceLookup);
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
  }, [occurrenceCompletions, sessions, tasks, timer]);
};
