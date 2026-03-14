import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTimerStore } from '../store/timerStore';
import { formatDurationClock } from '../utils/duration';
import { timerEngine } from '../services/timer/timerEngine';

export const useTimer = () => {
  const timerState = useTimerStore(useShallow((state) => ({
    activeMode: state.activeMode,
    status: state.status,
    expectedEndAt: state.expectedEndAt,
    pausedRemainingSeconds: state.pausedRemainingSeconds,
    focusMinutes: state.focusMinutes,
    shortBreakMinutes: state.shortBreakMinutes,
    longBreakMinutes: state.longBreakMinutes,
    completedFocusCountInCycle: state.completedFocusCountInCycle,
    selectedTaskId: state.selectedTaskId,
    selectedTagId: state.selectedTagId,
  })));
  const reconcileWithClock = useTimerStore((state) => state.reconcileWithClock);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (timerState.status !== 'running') {
      return;
    }

    const interval = setInterval(() => {
      setNow(new Date());
      void reconcileWithClock();
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [reconcileWithClock, timerState.status]);

  return useMemo(() => {
    const baseTimerState = {
      id: 'default',
      sessionStartedAt: null,
      startedAt: null,
      updatedAt: '',
      ...timerState,
    };
    const remainingSeconds = timerEngine.getRemainingSeconds(baseTimerState, now);
    const totalSeconds = timerEngine.getDurationSeconds(baseTimerState, timerState.activeMode);

    return {
      ...timerState,
      now,
      remainingSeconds,
      totalSeconds,
      progress: totalSeconds === 0 ? 0 : 1 - remainingSeconds / totalSeconds,
      formattedRemaining: formatDurationClock(remainingSeconds),
    };
  }, [now, timerState]);
};
