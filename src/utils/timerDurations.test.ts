import { describe, expect, it } from 'vitest';

import { stepDurationMinutes } from './timerDurations';

describe('stepDurationMinutes', () => {
  it('steps by one below ten minutes', () => {
    expect(stepDurationMinutes(5, 1, 180)).toBe(6);
    expect(stepDurationMinutes(5, -1, 180)).toBe(4);
    expect(stepDurationMinutes(9, 1, 180)).toBe(10);
    expect(stepDurationMinutes(10, -1, 180)).toBe(9);
  });

  it('steps by five from ten minutes on', () => {
    expect(stepDurationMinutes(25, 1, 180)).toBe(30);
    expect(stepDurationMinutes(25, -1, 180)).toBe(20);
    expect(stepDurationMinutes(10, 1, 180)).toBe(15);
  });

  it('snaps odd values to the next multiple of five', () => {
    expect(stepDurationMinutes(12, 1, 180)).toBe(15);
    expect(stepDurationMinutes(12, -1, 180)).toBe(10);
    expect(stepDurationMinutes(23, -1, 180)).toBe(20);
  });

  it('respects the limits', () => {
    expect(stepDurationMinutes(180, 1, 180)).toBe(180);
    expect(stepDurationMinutes(178, 1, 180)).toBe(180);
    expect(stepDurationMinutes(1, -1, 180)).toBe(1);
  });
});
