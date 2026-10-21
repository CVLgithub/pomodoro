export type SyncEntity = {
  id: string;
  updatedAt: string;
  isDeleted?: boolean;
  deletedAt?: string | null;
};

export const mergeByUpdatedAt = <T extends SyncEntity>(
  local: SyncEntity | undefined,
  incoming: T,
): SyncEntity | T => {
  if (!local || incoming.updatedAt > local.updatedAt) {
    return incoming;
  }
  return local;
};

export const orderQueueFifo = <T extends { createdAt: string; updatedAt: string }>(
  items: readonly T[],
): T[] =>
  [...items].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.updatedAt.localeCompare(right.updatedAt),
  );

export const isQueueItemBlockedByEarlier = <T extends { createdAt: string; updatedAt: string }>(
  item: T,
  items: readonly T[],
): boolean =>
  items.some(
    (candidate) =>
      candidate !== item &&
      (candidate.createdAt < item.createdAt ||
        (candidate.createdAt === item.createdAt && candidate.updatedAt < item.updatedAt)),
  );
