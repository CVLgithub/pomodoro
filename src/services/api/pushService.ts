import {
  PushSessionPayload,
  PushTagPayload,
  PushTagGroupsPayload,
  PushTaskPayload,
} from '../../types/api';
import { postJson } from './client';

export const pushTaskPayload = async (payload: PushTaskPayload): Promise<void> => {
  await postJson('/push/task', payload);
};

export const pushTagPayload = async (payload: PushTagPayload): Promise<void> => {
  await postJson('/push/tag', payload);
};

export const pushTagGroupsPayload = async (
  payload: PushTagGroupsPayload,
): Promise<void> => {
  await postJson('/push/tag-groups', payload);
};

export const pushSessionPayload = async (
  payload: PushSessionPayload,
): Promise<void> => {
  await postJson('/push/session', payload);
};
