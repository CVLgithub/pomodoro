export const minutesToSeconds = (minutes: number): number =>
  Math.max(0, Math.round(minutes * 60));

export const formatDurationClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** Wie `formatDurationClock`, ab einer Stunde aber als `h:mm:ss`. */
export const formatElapsedClock = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  if (safeSeconds < 3600) {
    return formatDurationClock(safeSeconds);
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/** Ausgeschriebene Dauer für Texte und Screenreader, z. B. "2 Std. 35 Min.". */
export const formatMinutesLong = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safeMinutes / 60);
  const remainder = safeMinutes % 60;

  if (hours === 0) {
    return `${remainder} Min.`;
  }

  return remainder === 0 ? `${hours} Std.` : `${hours} Std. ${remainder} Min.`;
};
