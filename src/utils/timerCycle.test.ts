import { describe, expect, it } from 'vitest';

import { getCycleRound } from './timerCycle';

describe('getCycleRound', () => {
  it('shows the running round during focus', () => {
    expect(getCycleRound('focus', 0, 4)).toBe(1);
    expect(getCycleRound('focus', 3, 4)).toBe(4);
  });

  it('shows the completed round during a short break', () => {
    expect(getCycleRound('shortBreak', 1, 4)).toBe(1);
    expect(getCycleRound('shortBreak', 3, 4)).toBe(3);
  });

  it('shows the full cycle during the long break after the counter wrapped', () => {
    expect(getCycleRound('longBreak', 0, 4)).toBe(4);
  });

  it('never shows round zero for a manually chosen break', () => {
    expect(getCycleRound('shortBreak', 0, 4)).toBe(1);
  });
});
