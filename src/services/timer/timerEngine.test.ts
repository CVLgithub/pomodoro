import { describe, expect, it } from 'vitest';

import { timerEngine } from './timerEngine';
import { getTrackedFocusMinutes } from './timerResume';

const startAt = new Date(2026, 10, 11, 14, 0, 0);
const minutesLater = (minutes: number) => new Date(startAt.getTime() + minutes * 60_000);

describe('timerEngine.extend', () => {
  it('verschiebt das Ende einer laufenden Session und zählt die Verlängerung mit', () => {
    const running = timerEngine.start(timerEngine.createDefaultState(), startAt);
    const extended = timerEngine.extend(running, 300, minutesLater(10));

    expect(timerEngine.getRemainingSeconds(extended, minutesLater(10))).toBe(20 * 60);
    expect(timerEngine.getSessionSeconds(extended)).toBe(30 * 60);
    expect(getTrackedFocusMinutes(extended, minutesLater(10))).toBe(10);
    expect(getTrackedFocusMinutes(extended, minutesLater(30))).toBe(30);
  });

  it('verlängert eine pausierte Session und behält die Verlängerung beim Fortsetzen', () => {
    const running = timerEngine.start(timerEngine.createDefaultState(), startAt);
    const paused = timerEngine.pause(running, minutesLater(20));
    const extended = timerEngine.extend(paused, 300, minutesLater(21));

    expect(extended.pausedRemainingSeconds).toBe(10 * 60);

    const resumed = timerEngine.resume(extended, minutesLater(25));

    expect(resumed.extraSeconds).toBe(300);
    expect(timerEngine.getRemainingSeconds(resumed, minutesLater(25))).toBe(10 * 60);
    expect(getTrackedFocusMinutes(resumed, minutesLater(35))).toBe(30);
  });

  it('wirkt im Leerlauf nicht und wird beim nächsten Start zurückgesetzt', () => {
    const idle = timerEngine.createDefaultState();

    expect(timerEngine.extend(idle, 300)).toBe(idle);

    const running = timerEngine.extend(timerEngine.start(idle, startAt), 300, startAt);
    const finished = timerEngine.finishNow(running, minutesLater(5));

    expect(finished.extraSeconds).toBe(0);
    expect(timerEngine.start(finished, minutesLater(6)).extraSeconds).toBe(0);
  });
});
