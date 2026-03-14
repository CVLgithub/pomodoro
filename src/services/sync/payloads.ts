import { PushSessionPayload } from '../../types/api';
import { Session } from '../../types/session';
import { TagDeletePayload } from '../../types/tag';
import { TaskDeletePayload } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';

export const toSessionPushPayload = (
  session: Session,
): PushSessionPayload => {
  const { syncStatus: _syncStatus, ...payload } = session;
  return payload;
};

export const createTaskDeletePayload = (id: string): TaskDeletePayload => ({
  id,
  deletedAt: toLocalIsoString(),
  isDeleted: true,
});

export const createTagDeletePayload = (id: string): TagDeletePayload => ({
  id,
  deletedAt: toLocalIsoString(),
  isDeleted: true,
});
