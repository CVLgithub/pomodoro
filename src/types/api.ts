import { Session } from './session';
import { Tag, TagDeletePayload } from './tag';
import { Task, TaskDeletePayload } from './task';

export type PushTaskPayload = Task | TaskDeletePayload;
export type PushTagPayload = Tag | TagDeletePayload;
export type PushSessionPayload = Omit<Session, 'syncStatus'>;

