const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_INPUT_PATTERN = /^\d{2}:\d{2}$/;

/**
 * Baut aus `YYYY-MM-DD` und `HH:MM` ein lokales Datum. Liefert `null`, wenn das
 * Format nicht stimmt oder der Zeitpunkt nicht existiert (z. B. 31. Februar).
 */
export const createLocalDate = (dateInput: string, timeInput: string): Date | null => {
  if (!DATE_INPUT_PATTERN.test(dateInput) || !TIME_INPUT_PATTERN.test(timeInput)) {
    return null;
  }

  const [year, month, day] = dateInput.split('-').map(Number);
  const [hours, minutes] = timeInput.split(':').map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hours ||
    date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date;
};

export interface ManualSessionDraft {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
}

/** Prüft einen manuell nachgetragenen Zeitraum und liefert ihn oder eine Fehlermeldung. */
export const validateManualSession = (
  draft: ManualSessionDraft,
  now = new Date(),
): { start: Date; end: Date } | { error: string } => {
  if (!draft.title.trim()) {
    return { error: 'Bitte gib einen Namen für die Session ein.' };
  }

  const start = createLocalDate(draft.date, draft.startTime);
  const end = createLocalDate(draft.date, draft.endTime);

  if (!start || !end) {
    return { error: 'Bitte nutze JJJJ-MM-TT für das Datum und HH:MM für die Uhrzeiten.' };
  }

  if (end <= start) {
    return { error: 'Die Endzeit muss nach der Startzeit liegen.' };
  }

  if (end > now) {
    return { error: 'Es können nur vergangene Sessions nachgetragen werden.' };
  }

  return { start, end };
};
