export const minutesToSeconds = (minutes: number): number =>
  Math.max(0, Math.round(minutes * 60));

export const secondsToMinutes = (seconds: number): number =>
  Math.max(0, Math.round(seconds / 60));

export const formatDurationClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export const formatMinutesShort = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
};

