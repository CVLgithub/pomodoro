import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  DownsyncEntityType,
  DownsyncPreviewEntry,
  applyPendingDownsyncEntry,
  listPendingDownsyncEntries,
} from '../src/services/sync/downsyncService';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { colors } from '../src/constants/colors';
import { radii, spacing } from '../src/constants/spacing';
import { useSessionsStore } from '../src/store/sessionsStore';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';
import { useTasksStore } from '../src/store/tasksStore';
import { useTimerStore } from '../src/store/timerStore';

const ENTRY_GROUPS: Array<{
  entityType: DownsyncEntityType;
  title: string;
  subtitle: string;
}> = [
  {
    entityType: 'session',
    title: 'Sessions',
    subtitle: 'Neue oder geänderte Sessions.',
  },
  {
    entityType: 'tagGroups',
    title: 'Gruppen',
    subtitle: 'Leere oder neu gespeicherte Tag-Gruppen.',
  },
  {
    entityType: 'tag',
    title: 'Tags',
    subtitle: 'Neue oder geänderte Tags.',
  },
  {
    entityType: 'task',
    title: 'Aufgaben',
    subtitle: 'Neue oder geänderte Aufgaben.',
  },
];

const ENTITY_LABELS: Record<DownsyncEntityType, string> = {
  tag: 'Tag',
  tagGroups: 'Gruppe',
  task: 'Aufgabe',
  session: 'Session',
};

export default function DownsyncScreen() {
  const router = useRouter();
  const loadTags = useTagsStore((state) => state.loadTags);
  const loadTasks = useTasksStore((state) => state.loadTasks);
  const loadSessions = useSessionsStore((state) => state.loadSessions);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const loadQueue = useSyncStore((state) => state.loadQueue);
  const hydrateTimer = useTimerStore((state) => state.hydrate);

  const [entries, setEntries] = useState<DownsyncPreviewEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const groupedEntries = useMemo(
    () =>
      ENTRY_GROUPS.map((group) => ({
        ...group,
        entries: entries.filter((entry) => entry.entityType === group.entityType),
      })),
    [entries],
  );

  const refreshAppState = async () => {
    await Promise.all([
      loadTags(),
      loadTasks(),
      loadSessions(),
      loadSettings(),
      loadQueue(),
      hydrateTimer(),
    ]);
  };

  const loadPendingEntries = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const pendingEntries = await listPendingDownsyncEntries();
      setEntries(pendingEntries);
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
    setActiveEntryId(entry.id);

    try {
      await applyPendingDownsyncEntry(entry.entityType, entry.entityId);
      await refreshAppState();
      await loadPendingEntries();
      Alert.alert(
        'Übernommen',
        `${ENTITY_LABELS[entry.entityType]} „${entry.title}“ wurde übernommen.`,
      );
    } catch (error) {
      Alert.alert(
        'Import fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setActiveEntryId(null);
    }
  };

  const confirmApplyEntry = (entry: DownsyncPreviewEntry) => {
    const confirmationLines = [entry.detail, entry.dependencyHint].filter(Boolean);

    Alert.alert(
      'Eintrag übernehmen?',
      confirmationLines.join('\n'),
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Übernehmen',
          onPress: () => {
            void applyEntry(entry);
          },
        },
      ],
    );
  };

  return (
    <Screen
      title="Import"
      subtitle="Prüfe neue oder geänderte Einträge und übernimm sie einzeln."
      headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader
          title="Manueller Import"
          subtitle="Hier kannst du neue oder geänderte Einträge prüfen."
          action={
            <Button
              label="Neu laden"
              variant="secondary"
              onPress={() => void loadPendingEntries()}
              disabled={isLoading || activeEntryId !== null}
            />
          }
        />
        <Text style={styles.infoText}>
          Verknüpfte Tags oder Aufgaben werden bei Bedarf mit übernommen.
        </Text>
      </SectionCard>

      {isLoading ? (
        <SectionCard>
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Einträge werden geladen...</Text>
          </View>
        </SectionCard>
      ) : null}

      {errorMessage && !isLoading ? (
        <SectionCard>
          <SectionHeader
            title="Laden fehlgeschlagen"
            subtitle="Die Einträge konnten nicht gelesen werden."
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Button
            label="Erneut versuchen"
            variant="secondary"
            onPress={() => void loadPendingEntries()}
            disabled={activeEntryId !== null}
          />
        </SectionCard>
      ) : null}

      {!isLoading && !errorMessage && entries.length === 0 ? (
        <EmptyState
          title="Keine offenen Einträge"
          description="Sobald neue oder geänderte Einträge vorhanden sind, kannst du sie hier übernehmen."
        />
      ) : null}

      {!isLoading && !errorMessage
        ? groupedEntries.map((group) =>
            group.entries.length > 0 ? (
              <SectionCard key={group.entityType}>
                <SectionHeader
                  title={group.title}
                  subtitle={`${group.entries.length} offen · ${group.subtitle}`}
                />
                <View style={styles.entryList}>
                  {group.entries.map((entry, index) => (
                    <View
                      key={entry.id}
                      style={[
                        styles.entryRow,
                        index > 0 ? styles.entryRowBorder : null,
                      ]}
                    >
                      <View style={styles.entryTextBlock}>
                        <View style={styles.entryMetaRow}>
                          <Text style={styles.entryType}>{ENTITY_LABELS[entry.entityType]}</Text>
                          <View style={styles.statusBadge}>
                            <Text style={styles.statusBadgeLabel}>{entry.statusLabel}</Text>
                          </View>
                        </View>
                        <Text style={styles.entryTitle}>{entry.title}</Text>
                        <Text style={styles.entryDetail}>{entry.detail}</Text>
                        <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
                        {entry.dependencyHint ? (
                          <Text style={styles.dependencyHint}>{entry.dependencyHint}</Text>
                        ) : null}
                      </View>
                      <View style={styles.entryAction}>
                        <Button
                          label={activeEntryId === entry.id ? 'Wird übernommen...' : 'Übernehmen'}
                          variant="secondary"
                          onPress={() => confirmApplyEntry(entry)}
                          disabled={activeEntryId !== null}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </SectionCard>
            ) : null,
          )
        : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  infoText: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  entryList: {
    gap: spacing.md,
  },
  entryRow: {
    gap: spacing.md,
  },
  entryRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  entryTextBlock: {
    gap: spacing.xs,
  },
  entryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  entryType: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusBadge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(94, 162, 255, 0.28)',
    backgroundColor: 'rgba(94, 162, 255, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusBadgeLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  entryTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  entryDetail: {
    color: colors.textPrimary,
    fontSize: 14,
  },
  entrySubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  dependencyHint: {
    color: colors.warning,
    fontSize: 13,
    lineHeight: 18,
  },
  entryAction: {
    alignSelf: 'flex-start',
    minWidth: 150,
  },
});
