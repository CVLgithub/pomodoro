import { EntriesResponse } from '../../types/api';
import { useSettingsStore } from '../../store/settingsStore';
import { getUserIdSetting } from '../../db/repositories/settingsRepository';

const isLocalHostname = (value: string): boolean =>
  ['localhost', '127.0.0.1', '::1'].includes(value.toLowerCase());

const getFetchFailureHint = (requestUrl: string): string => {
  if (typeof window === 'undefined') {
    return 'Prüfe die Adresse in den Einstellungen.';
  }

  try {
    const pageUrl = new URL(window.location.href);
    const backendUrl = new URL(requestUrl);

    if (pageUrl.protocol === 'https:' && backendUrl.protocol === 'http:') {
      return 'Die Verbindung wurde vom Browser blockiert. Prüfe die Adresse in den Einstellungen.';
    }

    if (!isLocalHostname(pageUrl.hostname) && isLocalHostname(backendUrl.hostname)) {
      return 'Die Adresse zeigt auf dieses Gerät. Prüfe, ob sie für diese App erreichbar ist.';
    }
  } catch {
    return 'Prüfe die Adresse in den Einstellungen.';
  }

  return 'Prüfe, ob die Adresse erreichbar ist.';
};

export const getEntriesRequestUrl = (): string => {
  const backendUrl = useSettingsStore.getState().backendUrl;
  return `${backendUrl}/entries`;
};

export const fetchEntries = async (): Promise<EntriesResponse> => {
  const requestUrl = getEntriesRequestUrl();
  const userId = await getUserIdSetting();
  if (!userId) {
    throw new Error('Keine userId konfiguriert. Bitte in Phase 4 einrichten.');
  }
  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method: 'GET',
      headers: { 'X-User-Id': userId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}. ${getFetchFailureHint(requestUrl)}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Die Anfrage ist fehlgeschlagen (${response.status}).`);
  }

  return (await response.json()) as EntriesResponse;
};
