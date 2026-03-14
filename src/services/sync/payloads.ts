import { PushSessionPayload, PushTagPayload, PushTaskPayload } from '../../types/api';
import { Session } from '../../types/session';
import { TagDeletePayload } from '../../types/tag';
import { TaskDeletePayload } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';

export const toTaskPushPayload = (task: {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
}): PushTaskPayload => ({
  id: task.id,
  title: task.title,
  date: task.date,
  tagId: task.tagId,
  isCompleted: task.isCompleted,
});

export const toTagPushPayload = (tag: {
  id: string;
  name: string;
  color: string;
}): PushTagPayload => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
});

export const toSessionPushPayload = (
  session: Session,
): PushSessionPayload => {
  return {
    id: session.id,
    title: session.title,
    date: session.date,
    startTime: session.startTime,
    endTime: session.endTime,
    durationMinutes: session.durationMinutes,
    taskId: session.taskId,
    tagId: session.tagId,
  };
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
