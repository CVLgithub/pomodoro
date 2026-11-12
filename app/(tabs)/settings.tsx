import { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemePicker } from '../../src/components/settings/ThemePicker';
import { ChoiceChips } from '../../src/components/ui/ChoiceChips';
import { ListGroup, ListRow, ToggleRow } from '../../src/components/ui/List';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { routes } from '../../src/constants/routes';
import { syncAndReload } from '../../src/services/sync/fullSync';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { START_PAGE_OPTIONS } from '../../src/types/settings';
import { formatDateKey, formatTimeLabel, getTodayDateKey } from '../../src/utils/date';

const formatSyncMoment = (isoValue: string): string => {
  const date = new Date(isoValue);
  const time = formatTimeLabel(date);

  return formatDateKey(date) === getTodayDateKey()
    ? `heute, ${time}`
    : `${date.getDate()}.${date.getMonth() + 1}., ${time}`;
};

export default function SettingsScreen() {
  const router = useRouter();
  const [startPageSheetVisible, setStartPageSheetVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const tagCount = useTagsStore((state) => state.tags.length);
  const deletedSessionCount = useSessionsStore((state) => state.deletedSessions.length);
  const failedQueueCount = useSyncStore(
    (state) => state.items.filter((item) => item.status === 'failed').length,
  );
  const userId = useSettingsStore((state) => state.userId);
  const startPage = useSettingsStore((state) => state.startPage);
  const autoSwitchToBreaks = useSettingsStore((state) => state.autoSwitchToBreaks);
  const notificationPreferences = useSettingsStore((state) => state.notificationPreferences);
  const lastSyncSuccessfulAt = useSettingsStore((state) => state.lastSyncSuccessfulAt);
  const lastSyncError = useSettingsStore((state) => state.lastSyncError);
  const saveStartPage = useSettingsStore((state) => state.saveStartPage);
  const saveAutoSwitchToBreaks = useSettingsStore((state) => state.saveAutoSwitchToBreaks);

  const reportError = (title: string) => (error: unknown) => {
    Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
  };

  const syncNow = async () => {
    setIsSyncing(true);
    try {
      await syncAndReload();
    } finally {
      setIsSyncing(false);
    }
  };

  const notificationsOn =
    notificationPreferences.notifyOnFocusEnd ||
    notificationPreferences.notifyOnBreakEnd ||
    notificationPreferences.dailyFocusGoalHours !== null;
  const syncDetail = !userId
    ? 'Erst unter „Verbindung“ eine userId eintragen'
    : isSyncing
      ? 'Synchronisierung läuft …'
      : lastSyncError
        ? `Fehlgeschlagen: ${lastSyncError}`
        : lastSyncSuccessfulAt
          ? `Zuletzt ${formatSyncMoment(lastSyncSuccessfulAt)}`
          : 'Noch nicht synchronisiert';

  return (
    <Screen title="Einstellungen">
      <SectionCard>
        <SectionHeader title="Darstellung" />
        <ThemePicker />
      </SectionCard>

      <ListGroup>
        <ListRow
          label="Startseite"
          value={START_PAGE_OPTIONS.find((option) => option.value === startPage)?.label}
          onPress={() => setStartPageSheetVisible(true)}
        />
        <ListRow
          label="Benachrichtigungen"
          value={notificationsOn ? 'Ein' : 'Aus'}
          onPress={() => router.push(routes.notifications)}
          separated
        />
        <ToggleRow
          label="Automatisch zu Pausen wechseln"
          detail="Nach einer Fokus-Session steht direkt die passende Pause bereit."
          value={autoSwitchToBreaks}
          onValueChange={(value) =>
            void saveAutoSwitchToBreaks(value).catch(
              reportError('Einstellung konnte nicht gespeichert werden'),
            )
          }
          separated
        />
      </ListGroup>

      <ListGroup>
        <ListRow
          label="Tags und Gruppen"
          value={String(tagCount)}
          onPress={() => router.push(routes.tags)}
        />
        <ListRow
          label="Gelöschte Sessions"
          value={String(deletedSessionCount)}
          onPress={() => router.push(routes.deletedSessions)}
          separated
        />
      </ListGroup>

      <ListGroup title="Synchronisierung">
        <ListRow
          label="Jetzt synchronisieren"
          detail={syncDetail}
          icon="sync"
          tone="action"
          disabled={!userId || isSyncing}
          onPress={() => void syncNow()}
        />
        <ListRow
          label="Fehlgeschlagene Übertragungen"
          value={String(failedQueueCount)}
          onPress={() => router.push(routes.syncQueue)}
          separated
        />
        <ListRow
          label="Verbindung"
          value={userId ? 'Eingerichtet' : 'Nicht eingerichtet'}
          onPress={() => router.push(routes.connection)}
          separated
        />
        <ListRow
          label="Manueller Import"
          detail="Einträge vom Server einzeln prüfen und übernehmen."
          onPress={() => router.push(routes.import)}
          separated
        />
      </ListGroup>

      <ModalSheet
        visible={startPageSheetVisible}
        title="Startseite"
        onClose={() => setStartPageSheetVisible(false)}
        swipeToClose
      >
        <ChoiceChips
          options={START_PAGE_OPTIONS}
          selected={[startPage]}
          onToggle={(value) => {
            setStartPageSheetVisible(false);
            void saveStartPage(value).catch(reportError('Startseite konnte nicht gespeichert werden'));
          }}
        />
      </ModalSheet>
    </Screen>
  );
}
