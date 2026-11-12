import { Session } from '../types/session';
import { addDays, formatDateKey, getMonthEnd, getMonthStart, getWeekStart, parseDateKey } from './date';

export type StatsPeriod = 'day' | 'week' | 'month' | 'all';

/** Zeitraum als Datumsschlüssel, beide Grenzen eingeschlossen. `null` heißt: alles. */
export type StatsRange = { startKey: string; endKey: string } | null;

export interface StatsBar {
  key: string;
  label: string;
  minutes: number;
  /** Markiert den Balken, der den heutigen Tag bzw. Monat enthält. */
  isCurrent: boolean;
}

const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
const ALL_TIME_MONTHS = 12;

export const getStatsRange = (period: StatsPeriod, anchor: Date): StatsRange => {
  if (period === 'all') {
    return null;
  }

  if (period === 'day') {
    const key = formatDateKey(anchor);
    return { startKey: key, endKey: key };
  }

  if (period === 'week') {
    const start = getWeekStart(anchor);
    return { startKey: formatDateKey(start), endKey: formatDateKey(addDays(start, 6)) };
  }

  return {
    startKey: formatDateKey(getMonthStart(anchor)),
    endKey: formatDateKey(getMonthEnd(anchor)),
  };
};

/** Verschiebt den Bezugstag um einen Zeitraum vor (+1) oder zurück (-1). */
export const shiftStatsAnchor = (period: StatsPeriod, anchor: Date, direction: 1 | -1): Date => {
  if (period === 'day') {
    return addDays(anchor, direction);
  }

  if (period === 'week') {
    return addDays(anchor, 7 * direction);
  }

  if (period === 'month') {
    return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1, 12);
  }

  return anchor;
};

export const filterSessionsByRange = (sessions: Session[], range: StatsRange): Session[] =>
  range
    ? sessions.filter((session) => session.date >= range.startKey && session.date <= range.endKey)
    : sessions;

export const formatStatsRangeLabel = (period: StatsPeriod, anchor: Date, todayKey: string): string => {
  const range = getStatsRange(period, anchor);

  if (!range) {
    return 'Gesamter Zeitraum';
  }

  const start = parseDateKey(range.startKey);
  const end = parseDateKey(range.endKey);

  if (period === 'day') {
    return range.startKey === todayKey
      ? 'Heute'
      : `${start.getDate()}. ${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }

  if (period === 'month') {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
  }

  return start.getMonth() === end.getMonth()
    ? `${start.getDate()}.–${end.getDate()}. ${MONTH_NAMES[end.getMonth()]}`
    : `${start.getDate()}. ${MONTH_LABELS[start.getMonth()]} – ${end.getDate()}. ${MONTH_LABELS[end.getMonth()]}`;
};

const sumByKey = (sessions: Session[], keyOf: (session: Session) => string): Map<string, number> => {
  const totals = new Map<string, number>();

  for (const session of sessions) {
    const key = keyOf(session);
    totals.set(key, (totals.get(key) ?? 0) + session.durationMinutes);
  }

  return totals;
};

/**
 * Balken des Diagramms: Wochentage, Monatstage oder (für "Gesamt") die letzten
 * zwölf Monate. Für einen einzelnen Tag gibt es kein Diagramm.
 */
export const buildStatsBars = (
  period: StatsPeriod,
  anchor: Date,
  sessions: Session[],
  todayKey: string,
): StatsBar[] => {
  if (period === 'day') {
    return [];
  }

  if (period === 'all') {
    const totals = sumByKey(sessions, (session) => session.date.slice(0, 7));
    const today = parseDateKey(todayKey);

    return Array.from({ length: ALL_TIME_MONTHS }, (_, index) => {
      const month = new Date(today.getFullYear(), today.getMonth() - (ALL_TIME_MONTHS - 1 - index), 1, 12);
      const key = formatDateKey(month).slice(0, 7);

      return {
        key,
        label: MONTH_LABELS[month.getMonth()].slice(0, 1),
        minutes: totals.get(key) ?? 0,
        isCurrent: index === ALL_TIME_MONTHS - 1,
      };
    });
  }

  const range = getStatsRange(period, anchor);
  if (!range) {
    return [];
  }

  const totals = sumByKey(sessions, (session) => session.date);
  const bars: StatsBar[] = [];

  for (
    let key = range.startKey, index = 0;
    key <= range.endKey;
    key = formatDateKey(addDays(key, 1)), index += 1
  ) {
    bars.push({
      key,
      label: period === 'week' ? WEEKDAY_LABELS[index] : index % 7 === 0 ? String(index + 1) : '',
      minutes: totals.get(key) ?? 0,
      isCurrent: key === todayKey,
    });
  }

  return bars;
};

export interface StatsSummary {
  totalMinutes: number;
  activeDays: number;
  /** Durchschnitt je Tag mit mindestens einer Session. */
  averageMinutesPerActiveDay: number;
  tags: { tagId: string; minutes: number }[];
}

export const summarizeSessions = (sessions: Session[]): StatsSummary => {
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const activeDays = new Set(sessions.map((session) => session.date)).size;
  const tags = Array.from(sumByKey(sessions, (session) => session.tagId).entries())
    .map(([tagId, minutes]) => ({ tagId, minutes }))
    .sort((left, right) => right.minutes - left.minutes);

  return {
    totalMinutes,
    activeDays,
    averageMinutesPerActiveDay: activeDays === 0 ? 0 : Math.round(totalMinutes / activeDays),
    tags,
  };
};

/** Dauer als Stunden und Minuten, z. B. `6:55`. */
export const formatHoursClock = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.round(minutes));
  return `${Math.floor(safeMinutes / 60)}:${String(safeMinutes % 60).padStart(2, '0')}`;
};
