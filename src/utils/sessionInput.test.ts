import { describe, expect, it } from 'vitest';

import { createLocalDate, validateManualSession } from './sessionInput';

const now = new Date(2026, 10, 12, 15, 0, 0);
const draft = { title: 'Lesen', date: '2026-11-12', startTime: '09:00', endTime: '09:25' };

describe('createLocalDate', () => {
  it('baut ein lokales Datum', () => {
    expect(createLocalDate('2026-11-12', '09:05')).toEqual(new Date(2026, 10, 12, 9, 5));
  });

  it('lehnt falsche Formate und nicht existierende Zeitpunkte ab', () => {
    expect(createLocalDate('12.11.2026', '09:05')).toBeNull();
    expect(createLocalDate('2026-02-31', '09:05')).toBeNull();
    expect(createLocalDate('2026-11-12', '24:00')).toBeNull();
    expect(createLocalDate('2026-11-12', '9:5')).toBeNull();
  });
});

describe('validateManualSession', () => {
  it('akzeptiert einen vergangenen Zeitraum', () => {
    expect(validateManualSession(draft, now)).toEqual({
      start: new Date(2026, 10, 12, 9, 0),
      end: new Date(2026, 10, 12, 9, 25),
    });
  });

  it('meldet fehlenden Namen, vertauschte Zeiten und Zeiträume in der Zukunft', () => {
    expect(validateManualSession({ ...draft, title: '  ' }, now)).toHaveProperty('error');
    expect(validateManualSession({ ...draft, endTime: '08:00' }, now)).toHaveProperty('error');
    expect(validateManualSession({ ...draft, endTime: '16:00' }, now)).toHaveProperty('error');
  });
});
