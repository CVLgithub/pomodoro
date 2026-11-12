import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../src/components/ui/Button';
import { CircleButton } from '../src/components/ui/CircleButton';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { colors } from '../src/constants/colors';
import {
  DownsyncEntityType,
  DownsyncPreviewEntry,
  applyPendingDownsyncEntry,
  listPendingDownsyncEntries,
} from '../src/services/sync/downsyncService';
import { reloadStores } from '../src/services/sync/fullSync';
import { useStopwatchStore } from '../src/store/stopwatchStore';
import { useTimerStore } from '../src/store/timerStore';
import { themedStyles } from '../src/theme/runtime';
import { confirmAction } from '../src/utils/confirm';

const ENTRY_GROUPS: readonly { entityType: DownsyncEntityType; title: string }[] = [
  { entityType: 'session', title: 'Sessions' },
  { entityType: 'tagGroup', title: 'Gruppen' },
  { entityType: 'tag', title: 'Tags' },
  { entityType: 'task', title: 'Aufgaben' },
];

export default function DownsyncScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<DownsyncPreviewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const groups = useMemo(
    () =>
      ENTRY_GROUPS.map((group) => ({
        ...group,
        entries: entries.filter((entry) => entry.entityType === group.entityType),
      })).filter((group) => group.entries.length > 0),
    [entries],
  );

  const loadPendingEntries = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      setEntries(await listPendingDownsyncEntries());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPendingEntries();
  }, []);

  const applyEntry = async (entry: DownsyncPreviewEntry) => {
    const confirmed = await confirmAction({
      title: `„${entry.title}“ übernehmen?`,
      message: [entry.detail, entry.dependencyHint].filter(Boolean).join('\n'),
      confirmLabel: 'Übernehmen',
      destructive: false,
    });

    if (!confirmed) {
      return;
    }

    setActiveEntryId(entry.id);

    try {
      await applyPendingDownsyncEntry(entry.entityType, entry.entityId);
      // Eine übernommene Löschung kann die Auswahl von Timer und Stoppuhr betreffen.
      await reloadStores();
      await Promise.all([
        useTimerStore.getState().hydrate(),
        useStopwatchStore.getState().hydrate(),
      ]);
      await loadPendingEntries();
    } catch (error) {
      Alert.alert(
        'Übernehmen fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setActiveEntryId(null);
    }
  };

  return (
    <Screen
      title="Manueller Import"
      subtitle="Einträge, die auf dem Server neuer sind als auf diesem Gerät. Verknüpfte Tags und Aufgaben werden bei Bedarf mit übernommen."
      onBack={() => router.back()}
      headerRight={
        <CircleButton
          icon="refresh"
          label="Neu laden"
          onPress={() => void loadPendingEntries()}
          disabled={isLoading || activeEntryId !== null}
        />
      }
    >
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textPrimary} />
          <Text style={styles.loadingLabel}>Einträge werden geladen …</Text>
        </View>
      ) : null}

      {errorMessage && !isLoading ? (
        <SectionCard>
          <SectionHeader title="Laden fehlgeschlagen" />
          <Text style={styles.error}>{errorMessage}</Text>
          <Button label="Erneut versuchen" variant="secondary" onPress={() => void loadPendingEntries()} />
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && entries.length === 0 ? (
        <EmptyState
          title="Alles auf dem neuesten Stand"
          description="Auf dem Server gibt es nichts, was diesem Gerät fehlt."
        />
      ) : null}

      {!isLoading && !errorMessage
        ? groups.map((group) => (
            <SectionCard key={group.entityType}>
              <SectionHeader title={group.title} subtitle={`${group.entries.length} offen`} />
              {group.entries.map((entry, index) => (
                <View key={entry.id} style={[styles.entry, index > 0 ? styles.entrySeparated : null]}>
                  <View style={styles.entryCopy}>
                    <Text style={styles.entryTitle}>{entry.title}</Text>
                    <Text style={styles.entryMeta}>
                      {entry.statusLabel} · {entry.detail}
                    </Text>
                    <Text style={styles.entryMeta}>{entry.subtitle}</Text>
                    {entry.dependencyHint ? (
                      <Text style={styles.hint}>{entry.dependencyHint}</Text>
                    ) : null}
                  </View>
                  <Button
                    label={activeEntryId === entry.id ? 'Übernimmt …' : 'Übernehmen'}
                    variant="secondary"
                    compact
                    onPress={() => void applyEntry(entry)}
                    disabled={activeEntryId !== null}
                  />
                </View>
              ))}
            </SectionCard>
          ))
        : null}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  loading: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  loadingLabel: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  entrySeparated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  entryCopy: {
    flex: 1,
    gap: 2,
  },
  entryTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  entryMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  hint: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
}));
