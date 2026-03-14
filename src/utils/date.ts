const pad = (value: number): string => String(value).padStart(2, '0');

export const toLocalIsoString = (date = new Date()): string => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absolute = Math.abs(offsetMinutes);
  const hoursOffset = Math.floor(absolute / 60);
  const minutesOffset = absolute % 60;

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    `${sign}${pad(hoursOffset)}:${pad(minutesOffset)}`,
  ].join('');
};

export const parseDateInput = (value?: string | Date | null): Date => {
  if (!value) {
    return new Date();
  }

  return value instanceof Date ? value : new Date(value);
};

export const formatDateKey = (value?: string | Date | null): string => {
  const date = parseDateInput(value);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const getTodayDateKey = (): string => formatDateKey(new Date());

export const addMinutes = (value: string | Date, minutes: number): Date => {
  const base = parseDateInput(value);
  return new Date(base.getTime() + minutes * 60 * 1000);
};

export const addSeconds = (value: string | Date, seconds: number): Date => {
  const base = parseDateInput(value);
  return new Date(base.getTime() + seconds * 1000);
};

export const differenceInSeconds = (
  futureValue: string | Date,
  fromValue = new Date(),
): number => {
  const future = parseDateInput(futureValue).getTime();
  const from = parseDateInput(fromValue).getTime();
  return Math.round((future - from) / 1000);
};

export const formatTimeLabel = (value: string | Date): string => {
  const date = parseDateInput(value);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const getWeekStart = (value = new Date()): Date => {
  const date = new Date(value);
  const currentDay = date.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + diff);
  return date;
};

export const getMonthStart = (value = new Date()): Date => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  date.setDate(1);
  return date;
};

export const isDateWithinRange = (
  dateKey: string,
  start: Date,
  end: Date,
): boolean => {
  const value = new Date(`${dateKey}T00:00:00`);
  return value.getTime() >= start.getTime() && value.getTime() <= end.getTime();
};

