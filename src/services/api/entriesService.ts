import { EntriesResponse } from '../../types/api';
import { useSettingsStore } from '../../store/settingsStore';

const isLocalHostname = (value: string): boolean =>
  ['localhost', '127.0.0.1', '::1'].includes(value.toLowerCase());

const getFetchFailureHint = (requestUrl: string): string => {
  if (typeof window === 'undefined') {
    return 'Prüfe Backend-URL, CORS und http/https.';
  }

  try {
    const pageUrl = new URL(window.location.href);
    const backendUrl = new URL(requestUrl);

    if (pageUrl.protocol === 'https:' && backendUrl.protocol === 'http:') {
      return 'Die Web-App läuft über HTTPS, das Backend aber über HTTP. Browser blockieren das als Mixed Content.';
    }

    if (!isLocalHostname(pageUrl.hostname) && isLocalHostname(backendUrl.hostname)) {
      return 'Die Web-App läuft nicht lokal, die Backend-URL zeigt aber auf localhost. Im Browser bedeutet localhost immer das Gerät des Besuchers.';
    }
  } catch {
    return 'Prüfe Backend-URL, CORS und http/https.';
  }

  return 'Prüfe, ob das Backend erreichbar ist und CORS für diese Web-Origin erlaubt.';
};

export const getEntriesRequestUrl = (): string => {
  const backendUrl = useSettingsStore.getState().backendUrl;
  return `${backendUrl}/entries`;
};

export const fetchEntries = async (): Promise<EntriesResponse> => {
  const requestUrl = getEntriesRequestUrl();
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: 'GET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `GET ${requestUrl} failed: ${message}. ${getFetchFailureHint(requestUrl)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `GET ${requestUrl} failed with status ${response.status}`);
  }

  return (await response.json()) as EntriesResponse;
};
