import {
  PushSessionPayload,
  PushTagPayload,
  PushTaskPayload,
} from '../../types/api';
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
  recurrenceType: 'none' | 'weekly';
  recurrenceDays: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}): PushTaskPayload => ({
  id: task.id,
  title: task.title,
  date: task.date,
  tagId: task.tagId,
  isCompleted: task.isCompleted,
  recurrenceType: task.recurrenceType,
  recurrenceDays: task.recurrenceDays,
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
  isDeleted: task.isDeleted,
  deletedAt: task.deletedAt,
});

export const toTagPushPayload = (tag: {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}): PushTagPayload => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  groupId: tag.groupId,
  createdAt: tag.createdAt,
  updatedAt: tag.updatedAt,
  isDeleted: tag.isDeleted,
  deletedAt: tag.deletedAt,
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
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    isDeleted: session.isDeleted,
    deletedAt: session.deletedAt,
  };
};

export const createTaskDeletePayload = (id: string): TaskDeletePayload => ({
  id,
  deletedAt: toLocalIsoString(),
  updatedAt: toLocalIsoString(),
  isDeleted: true,
});

export const createTagDeletePayload = (id: string): TagDeletePayload => ({
  id,
  deletedAt: toLocalIsoString(),
  updatedAt: toLocalIsoString(),
  isDeleted: true,
});
