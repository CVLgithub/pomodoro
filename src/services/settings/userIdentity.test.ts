import { describe, expect, it } from 'vitest';

import {
  normalizeUserId,
  requiresNewIdentityWarning,
  validateAndNormalizeUserId,
} from './userIdentity';

describe('user identity helpers', () => {
  it('trims and normalizes UUIDs', () => {
    expect(validateAndNormalizeUserId(' 550E8400-E29B-41D4-A716-446655440000 ')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    );
    expect(normalizeUserId(' ABC ')).toBe('abc');
  });

  it('rejects invalid UUIDs', () => {
    expect(() => validateAndNormalizeUserId('not-a-uuid')).toThrow('gültige UUID');
  });

  it('only warns when local data or queue entries exist', () => {
    expect(requiresNewIdentityWarning(0, 0)).toBe(false);
    expect(requiresNewIdentityWarning(1, 0)).toBe(true);
    expect(requiresNewIdentityWarning(0, 1)).toBe(true);
  });
});
