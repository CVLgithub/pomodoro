import { Tag, TagDeletePayload } from './tag';
import { Task, TaskDeletePayload } from './task';
import { Session } from './session';

export type PushTaskPayload =
  | Pick<Task, 'id' | 'title' | 'date' | 'tagId' | 'isCompleted'>
  | TaskDeletePayload;
export type PushTagPayload = Pick<Tag, 'id' | 'name' | 'color'> | TagDeletePayload;
export type PushSessionPayload = Pick<
  Session,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'durationMinutes' | 'taskId' | 'tagId'
>;

export interface EntriesTag {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntriesTask {
  id: string;
  title: string;
  date: string | null;
  tagId: string;
  isCompleted: boolean;
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
}
