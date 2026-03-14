import { useSettingsStore } from '../../store/settingsStore';

export const postJson = async <TPayload>(
  endpoint: string,
  payload: TPayload,
): Promise<void> => {
  const backendUrl = useSettingsStore.getState().backendUrl;
  const response = await fetch(`${backendUrl}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }
};
