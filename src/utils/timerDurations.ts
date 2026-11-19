/** Ab dieser Dauer ändern die Tasten die Minuten in Fünferschritten. */
const COARSE_STEP_FROM = 10;
const COARSE_STEP = 5;

/**
 * Nächste Dauer für die Plus- und Minus-Tasten: unter 10 Minuten in
 * Einerschritten, darüber in Fünferschritten, gerundet auf das nächste
 * Vielfache von fünf (12 → 15 bzw. 12 → 10).
 */
export const stepDurationMinutes = (
  current: number,
  direction: 1 | -1,
  max: number,
  min = 1,
): number => {
  const value = Math.round(current);
  let next: number;

  if (direction === 1) {
    next =
      value < COARSE_STEP_FROM
        ? value + 1
        : (Math.floor(value / COARSE_STEP) + 1) * COARSE_STEP;
  } else {
    next =
      value <= COARSE_STEP_FROM
        ? value - 1
        : (Math.ceil(value / COARSE_STEP) - 1) * COARSE_STEP;
  }

  return Math.min(max, Math.max(min, next));
};
