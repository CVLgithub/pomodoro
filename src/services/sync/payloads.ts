import {
  PushSessionPayload,
  PushTagGroupsPayload,
  PushTagPayload,
  PushTaskPayload,
} from '../../types/api';
import { Session } from '../../types/session';
import { TagDeletePayload } from '../../types/tag';
import { TaskDeletePayload } from '../../types/task';
import { toLocalIsoString } from '../../utils/date';
import { normalizeTagGroupNames } from '../../utils/tagGroups';

export const toTaskPushPayload = (task: {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
  recurrenceType: 'none' | 'weekly';
  recurrenceDays: (0 | 1 | 2 | 3 | 4 | 5 | 6)[];
}): PushTaskPayload => ({
  id: task.id,
  title: task.title,
  date: task.date,
  tagId: task.tagId,
  isCompleted: task.isCompleted,
  recurrenceType: task.recurrenceType,
  recurrenceDays: task.recurrenceDays,
});

export const toTagPushPayload = (tag: {
  id: string;
  name: string;
  color: string;
  groupName: string | null;
}): PushTagPayload => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
  groupName: tag.groupName,
});

export const toTagGroupsPushPayload = (tagGroups: string[]): PushTagGroupsPayload => ({
  tagGroups: normalizeTagGroupNames(tagGroups),
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
