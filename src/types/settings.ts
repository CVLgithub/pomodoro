export const START_PAGE_OPTIONS = [
  { value: 'today', label: 'Heute' },
  { value: 'timer', label: 'Timer' },
  { value: 'calendar', label: 'Kalender' },
  { value: 'tasks', label: 'Aufgaben' },
  { value: 'stats', label: 'Statistik' },
] as const;

export type StartPage = (typeof START_PAGE_OPTIONS)[number]['value'];

export const DEFAULT_START_PAGE: StartPage = 'timer';

export const isStartPage = (value: string): value is StartPage =>
  START_PAGE_OPTIONS.some((option) => option.value === value);