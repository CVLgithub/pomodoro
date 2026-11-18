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
  summarizeTagTasks,
} from './stats';

const session = (
  date: string,
  durationMinutes: number,
  tagId = 'a',
  options?: { title?: string; taskId?: string | null },
): Session => ({
  id: `${date}-${durationMinutes}-${tagId}-${options?.taskId ?? options?.title ?? ''}`,
  title: options?.title ?? 'Session',
  date,
  startTime: `${date}T09:00:00+01:00`,
  endTime: `${date}T10:00:00+01:00`,
  durationMinutes,
  taskId: options?.taskId ?? null,
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

describe('summarizeTagTasks', () => {
  it('gruppiert Sessions eines Tags nach Aufgabe bzw. Titel und sortiert nach Zeit', () => {
    const tagSessions = [
      session('2026-11-09', 25, 'a', { taskId: 't1', title: 'Alter Titel' }),
      session('2026-11-10', 50, 'a', { taskId: 't1', title: 'Neuer Titel' }),
      session('2026-11-10', 40, 'a', { title: 'Freie Session' }),
      session('2026-11-11', 20, 'a', { title: 'freie session' }),
      session('2026-11-11', 30, 'a', { taskId: 't2', title: 'Übungsblatt 3' }),
      session('2026-11-11', 90, 'b', { taskId: 't3', title: 'Anderer Tag' }),
    ];
    const taskTitles = new Map([['t1', 'Kapitel 4 lesen']]);

    expect(summarizeTagTasks(tagSessions, 'a', taskTitles)).toEqual([
      {
        key: 'task:t1',
        taskId: 't1',
        title: 'Kapitel 4 lesen',
        minutes: 75,
        sessionCount: 2,
      },
      {
        key: 'title:freie session',
        taskId: null,
        title: 'Freie Session',
        minutes: 60,
        sessionCount: 2,
      },
      {
        key: 'task:t2',
        taskId: 't2',
        title: 'Übungsblatt 3',
        minutes: 30,
        sessionCount: 1,
      },
    ]);
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
