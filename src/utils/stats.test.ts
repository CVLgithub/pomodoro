import { describe, expect, it } from 'vitest';

import { Session } from '../types/session';
import {
  buildStatsBars,
  filterSessionsByRange,
  formatHoursClock,
  formatStatsRangeLabel,
  getStatsRange,
  shiftStatsAnchor,
  summarizeSessions,
} from './stats';

const session = (date: string, durationMinutes: number, tagId = 'a'): Session => ({
  id: `${date}-${durationMinutes}-${tagId}`,
  title: 'Session',
  date,
  startTime: `${date}T09:00:00+01:00`,
  endTime: `${date}T10:00:00+01:00`,
  durationMinutes,
  taskId: null,
  tagId,
  syncStatus: 'synced',
  createdAt: date,
  updatedAt: date,
  isDeleted: false,
  deletedAt: null,
});

// Mittwoch, 11. November 2026
const anchor = new Date(2026, 10, 11, 12);
const todayKey = '2026-11-11';
const sessions = [
  session('2026-11-09', 150, 'a'),
  session('2026-11-10', 110, 'b'),
  session('2026-11-11', 80, 'a'),
  session('2026-11-11', 75, 'b'),
  session('2026-11-02', 30, 'c'),
  session('2026-10-20', 60, 'a'),
];

describe('getStatsRange', () => {
  it('liefert Tag, Woche (Montag bis Sonntag) und Monat', () => {
    expect(getStatsRange('day', anchor)).toEqual({ startKey: '2026-11-11', endKey: '2026-11-11' });
    expect(getStatsRange('week', anchor)).toEqual({ startKey: '2026-11-09', endKey: '2026-11-15' });
    expect(getStatsRange('month', anchor)).toEqual({ startKey: '2026-11-01', endKey: '2026-11-30' });
    expect(getStatsRange('all', anchor)).toBeNull();
  });
});

describe('shiftStatsAnchor', () => {
  it('springt um einen Zeitraum', () => {
    expect(getStatsRange('week', shiftStatsAnchor('week', anchor, -1))?.startKey).toBe('2026-11-02');
    expect(getStatsRange('month', shiftStatsAnchor('month', anchor, 1))?.startKey).toBe('2026-12-01');
    expect(getStatsRange('month', shiftStatsAnchor('month', new Date(2026, 0, 31, 12), 1))?.startKey).toBe(
      '2026-02-01',
    );
  });
});

describe('summarizeSessions', () => {
  it('summiert die Woche und sortiert Tags nach Zeit', () => {
    const week = filterSessionsByRange(sessions, getStatsRange('week', anchor));

    expect(summarizeSessions(week)).toEqual({
      totalMinutes: 415,
      activeDays: 3,
      averageMinutesPerActiveDay: 138,
      tags: [
        { tagId: 'a', minutes: 230 },
        { tagId: 'b', minutes: 185 },
      ],
    });
  });

  it('kommt mit einem leeren Zeitraum zurecht', () => {
    expect(summarizeSessions([])).toEqual({
      totalMinutes: 0,
      activeDays: 0,
      averageMinutesPerActiveDay: 0,
      tags: [],
    });
  });
});

describe('buildStatsBars', () => {
  it('baut sieben Wochentage und markiert heute', () => {
    const bars = buildStatsBars('week', anchor, sessions, todayKey);

    expect(bars.map((bar) => bar.label)).toEqual(['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']);
    expect(bars.map((bar) => bar.minutes)).toEqual([150, 110, 155, 0, 0, 0, 0]);
    expect(bars.filter((bar) => bar.isCurrent).map((bar) => bar.key)).toEqual([todayKey]);
  });

  it('baut einen Balken je Monatstag', () => {
    const bars = buildStatsBars('month', anchor, sessions, todayKey);

    expect(bars).toHaveLength(30);
    expect(bars[1].minutes).toBe(30);
    expect(bars.filter((bar) => bar.label).map((bar) => bar.label)).toEqual(['1', '8', '15', '22', '29']);
  });

  it('baut für den gesamten Zeitraum die letzten zwölf Monate', () => {
    const bars = buildStatsBars('all', anchor, sessions, todayKey);

    expect(bars).toHaveLength(12);
    expect(bars[11]).toMatchObject({ key: '2026-11', minutes: 445, isCurrent: true });
    expect(bars[10]).toMatchObject({ key: '2026-10', minutes: 60 });
    expect(buildStatsBars('day', anchor, sessions, todayKey)).toEqual([]);
  });
});

describe('Beschriftungen', () => {
  it('formatiert Dauer und Zeitraum', () => {
    expect(formatHoursClock(415)).toBe('6:55');
    expect(formatHoursClock(45)).toBe('0:45');
    expect(formatStatsRangeLabel('day', anchor, todayKey)).toBe('Heute');
    expect(formatStatsRangeLabel('week', anchor, todayKey)).toBe('9.–15. November');
    expect(formatStatsRangeLabel('week', new Date(2026, 10, 30, 12), todayKey)).toBe('30. Nov – 6. Dez');
    expect(formatStatsRangeLabel('month', anchor, todayKey)).toBe('November 2026');
  });
});
