import { BACKEND_URL } from '../../constants/config';

export const postJson = async <TPayload>(
  endpoint: string,
  payload: TPayload,
): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
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

