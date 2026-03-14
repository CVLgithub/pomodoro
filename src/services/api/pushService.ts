import {
  PushSessionPayload,
  PushTagPayload,
  PushTaskPayload,
} from '../../types/api';
import { postJson } from './client';

export const pushTaskPayload = async (payload: PushTaskPayload): Promise<void> => {
  await postJson('/push/task', payload);
};

export const pushTagPayload = async (payload: PushTagPayload): Promise<void> => {
  await postJson('/push/tag', payload);
};

export const pushSessionPayload = async (
  payload: PushSessionPayload,
): Promise<void> => {
  await postJson('/push/session', payload);
};

