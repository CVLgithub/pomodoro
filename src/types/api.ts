import { Tag, TagDeletePayload } from './tag';
import { Task, TaskDeletePayload, TaskRecurrenceType, TaskWeekday } from './task';
import { Session } from './session';
import { TagGroup } from './tagGroup';

export type PushTaskPayload =
  | Pick<
      Task,
      'id' | 'title' | 'date' | 'tagId' | 'isCompleted' | 'recurrenceType' | 'recurrenceDays' |
        'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
    >
  | TaskDeletePayload;
export type PushTagPayload = Pick<Tag, 'id' | 'name' | 'color' | 'groupId' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'> | TagDeletePayload;
export type PushTagGroupPayload = Pick<TagGroup, 'id' | 'name' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'>;
export type PushSessionPayload = Pick<
  Session,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'durationMinutes' | 'taskId' | 'tagId' |
  'createdAt' | 'updatedAt' | 'isDeleted' | 'deletedAt'
>;

export interface EntriesTag {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface EntriesTask {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
  recurrenceType?: TaskRecurrenceType | null;
  recurrenceDays?: TaskWeekday[] | null;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface EntriesSession {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  taskId: string | null;
  tagId: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  deletedAt: string | null;
}

export interface EntriesResponse {
  tags: EntriesTag[];
  tasks: EntriesTask[];
  sessions: EntriesSession[];
  tagGroups: TagGroup[];
}
