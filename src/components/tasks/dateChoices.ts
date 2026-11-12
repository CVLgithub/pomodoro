import { addDays, formatDateKey, formatShortDateLabel, getTodayDateKey } from '../../utils/date';

export type DateChoice = 'none' | 'today' | 'tomorrow' | 'other';

export const getTomorrowDateKey = (): string => formatDateKey(addDays(getTodayDateKey(), 1));

/** Ordnet ein Datum der passenden Schnellauswahl zu. */
export const getDateChoice = (date: string | null): DateChoice => {
  if (!date) {
    return 'none';
  }

  if (date === getTodayDateKey()) {
    return 'today';
  }

  return date === getTomorrowDateKey() ? 'tomorrow' : 'other';
};

export const buildDateChoiceOptions = (
  date: string | null,
  allowClear: boolean,
): { value: DateChoice; label: string }[] => [
  ...(allowClear ? [{ value: 'none' as const, label: 'Kein Datum' }] : []),
  { value: 'today', label: 'Heute' },
  { value: 'tomorrow', label: 'Morgen' },
  {
    value: 'other',
    label: date && getDateChoice(date) === 'other' ? formatShortDateLabel(date) : 'Anderes Datum',
  },
];
