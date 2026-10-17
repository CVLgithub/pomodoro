export type StopwatchStatus = 'idle' | 'running';
export type StopwatchPhase = 'active' | 'break';

export interface StopwatchStateRecord {
  id: string;
  status: StopwatchStatus;
  phase: StopwatchPhase;
  sessionStartedAt: string | null;
  phaseStartedAt: string | null;
  activeElapsedSeconds: number;
  breakElapsedSeconds: number;
  selectedTaskId: string | null;
  selectedTagId: string;
}