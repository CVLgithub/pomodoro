import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Alert, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { ThemePicker } from '../../src/components/settings/ThemePicker';
import { DropdownMenu, MenuAnchor } from '../../src/components/ui/DropdownMenu';
import { ListGroup, ListRow, ToggleRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { colors } from '../../src/constants/colors';
import { routes } from '../../src/constants/routes';
import { syncAndReload } from '../../src/services/sync/fullSync';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
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
  const startPageRow = useRef<ComponentRef<typeof View>>(null);
  const [startPageMenuAnchor, setStartPageMenuAnchor] = useState<MenuAnchor | null>(null);
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
        {/* collapsable={false} hält die View nativ erhalten, damit sie sich messen lässt. */}
        <View ref={startPageRow} collapsable={false}>
          <ListRow
            label="Startseite"
            onPress={() =>
              startPageRow.current?.measureInWindow((x, y, width, height) =>
                setStartPageMenuAnchor({ x, y, width, height }),
              )
            }
            right={
              <View style={styles.menuValue}>
                <Text style={styles.menuValueText} numberOfLines={1}>
                  {START_PAGE_OPTIONS.find((option) => option.value === startPage)?.label}
                </Text>
                <Ionicons name="chevron-expand" size={16} color={colors.textSecondary} />
              </View>
            }
          />
        </View>
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

      <DropdownMenu
        anchor={startPageMenuAnchor}
        options={START_PAGE_OPTIONS}
        selected={startPage}
        onClose={() => setStartPageMenuAnchor(null)}
        onSelect={(value) => {
          setStartPageMenuAnchor(null);
          void saveStartPage(value).catch(reportError('Startseite konnte nicht gespeichert werden'));
        }}
      />
    </Screen>
  );
}

const styles = themedStyles(() => ({
  menuValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuValueText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
}));
