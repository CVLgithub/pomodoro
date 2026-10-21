import {
  PushSessionPayload,
  PushTagPayload,
  PushTagGroupPayload,
  PushTaskPayload,
} from '../../types/api';
import { postJson } from './client';

export const pushTaskPayload = async (payload: PushTaskPayload): Promise<void> => {
  await postJson('/push/task', payload);
};

export const pushTagPayload = async (payload: PushTagPayload): Promise<void> => {
  await postJson('/push/tag', payload);
};

export const pushTagGroupPayload = async (payload: PushTagGroupPayload): Promise<void> => {
  await postJson('/push/tag-group', payload);
};

export const pushSessionPayload = async (
  payload: PushSessionPayload,
): Promise<void> => {
  await postJson('/push/session', payload);
};
