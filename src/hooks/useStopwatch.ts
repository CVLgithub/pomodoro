import { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useStopwatchStore } from '../store/stopwatchStore';
import { formatDurationClock } from '../utils/duration';

export const useStopwatch = () => {
  const stopwatchState = useStopwatchStore(useShallow((state) => ({
    status: state.status,
    phase: state.phase,
    phaseStartedAt: state.phaseStartedAt,
    activeElapsedSeconds: state.activeElapsedSeconds,
    breakElapsedSeconds: state.breakElapsedSeconds,
    selectedTaskId: state.selectedTaskId,
    selectedTagId: state.selectedTagId,
  })));
  const [now, setNow] = useState(() => new Date());
  const effectiveNow = stopwatchState.status === 'running' ? new Date() : now;

  useEffect(() => {
    if (stopwatchState.status !== 'running') {
      return;
    }

    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);

    return () => clearInterval(interval);
  }, [stopwatchState.status]);

  return useMemo(() => {
    const phaseSeconds =
      stopwatchState.status === 'running' && stopwatchState.phaseStartedAt
        ? Math.max(
            0,
            Math.floor(
              (effectiveNow.getTime() - new Date(stopwatchState.phaseStartedAt).getTime()) / 1000,
            ),
          )
        : 0;
    const activeSeconds =
      stopwatchState.activeElapsedSeconds +
      (stopwatchState.phase === 'active' ? phaseSeconds : 0);
    const breakSeconds =
      stopwatchState.breakElapsedSeconds +
      (stopwatchState.phase === 'break' ? phaseSeconds : 0);

    return {
      ...stopwatchState,
      activeSeconds,
      breakSeconds,
      formattedActive: formatDurationClock(activeSeconds),
      formattedBreak: formatDurationClock(breakSeconds),
    };
  }, [effectiveNow, stopwatchState]);
};