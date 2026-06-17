import { Tag, TagDeletePayload } from './tag';
import { Task, TaskDeletePayload, TaskRecurrenceType, TaskWeekday } from './task';
import { Session } from './session';

export type PushTaskPayload =
  | Pick<
      Task,
      'id' | 'title' | 'date' | 'tagId' | 'isCompleted' | 'recurrenceType' | 'recurrenceDays'
    >
  | TaskDeletePayload;
export type PushTagPayload = Pick<Tag, 'id' | 'name' | 'color' | 'groupName'> | TagDeletePayload;
export interface PushTagGroupsPayload {
  tagGroups: string[];
}
export type PushSessionPayload = Pick<
  Session,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'durationMinutes' | 'taskId' | 'tagId'
>;

export interface EntriesTag {
  id: string;
  name: string;
  color: string;
  groupName?: string | null;
  createdAt: string;
  updatedAt: string;
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
}

export interface EntriesResponse {
  tags: EntriesTag[];
  tasks: EntriesTask[];
  sessions: EntriesSession[];
  tagGroups?: string[];
}
