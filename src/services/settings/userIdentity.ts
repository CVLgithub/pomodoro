const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const normalizeUserId = (value: string): string => value.trim().toLowerCase();

export const validateAndNormalizeUserId = (value: string): string => {
  const normalized = normalizeUserId(value);
  if (!UUID_PATTERN.test(normalized)) {
    throw new Error('Bitte gib eine gültige UUID ein.');
  }
  return normalized;
};

export const requiresNewIdentityWarning = (dataCount: number, queueCount: number): boolean =>
  dataCount > 0 || queueCount > 0;
