import { useSettingsStore } from '../../store/settingsStore';
import { getUserIdSetting } from '../../db/repositories/settingsRepository';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export const postJson = async <TPayload>(
  endpoint: string,
  payload: TPayload,
): Promise<void> => {
  const backendUrl = useSettingsStore.getState().backendUrl;
  const userId = await getUserIdSetting();
  if (!userId) {
    throw new Error('Keine userId konfiguriert. Bitte in Phase 4 einrichten.');
  }
  const response = await fetch(`${backendUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiRequestError(
      body || `Senden fehlgeschlagen (${response.status}).`,
      response.status,
    );
  }
};
