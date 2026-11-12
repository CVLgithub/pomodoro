export const START_PAGE_OPTIONS = [
  { value: 'today', label: 'Stoppuhr' },
  { value: 'timer', label: 'Timer' },
  { value: 'tasks', label: 'Aufgaben' },
  { value: 'stats', label: 'Statistik' },
] as const;

export type StartPage = (typeof START_PAGE_OPTIONS)[number]['value'];

export const DEFAULT_START_PAGE: StartPage = 'timer';

/** Der frühere Kalender-Tab ist jetzt eine Ansicht im Aufgaben-Tab. */
const LEGACY_START_PAGES: Record<string, StartPage> = {
  calendar: 'tasks',
};

export const isStartPage = (value: string): value is StartPage =>
  START_PAGE_OPTIONS.some((option) => option.value === value);

export const resolveStartPage = (value?: string | null): StartPage => {
  if (!value) {
    return DEFAULT_START_PAGE;
  }

  return isStartPage(value) ? value : (LEGACY_START_PAGES[value] ?? DEFAULT_START_PAGE);
};
