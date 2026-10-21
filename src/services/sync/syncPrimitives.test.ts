import { describe, expect, it } from 'vitest';
import { isQueueItemBlockedByEarlier, mergeByUpdatedAt, orderQueueFifo } from './syncPrimitives';

const entity = (updatedAt: string, isDeleted = false) => ({
  id: 'one',
  value: isDeleted ? 'deleted' : updatedAt,
  updatedAt,
  isDeleted,
  deletedAt: isDeleted ? updatedAt : null,
});

describe('sync primitives', () => {
  it('uses the newer entity, including a tombstone', () => {
    expect(mergeByUpdatedAt(entity('2026-01-02'), entity('2026-01-03', true)).isDeleted).toBe(true);
  });

  it('keeps a local pending entity when the incoming update is not newer', () => {
    const local = entity('2026-01-03');
    expect(mergeByUpdatedAt(local, entity('2026-01-02'))).toBe(local);
  });

  it('allows a newer restore to replace a tombstone', () => {
    expect(mergeByUpdatedAt(entity('2026-01-02', true), entity('2026-01-03')).isDeleted).toBe(false);
  });

  it('orders queue items FIFO and detects earlier blockers', () => {
    const items = [
      { createdAt: '2026-01-03', updatedAt: '2026-01-03' },
      { createdAt: '2026-01-01', updatedAt: '2026-01-02' },
    ];
    expect(orderQueueFifo(items)).toEqual([items[1], items[0]]);
    expect(isQueueItemBlockedByEarlier(items[0], items)).toBe(true);
  });
});
