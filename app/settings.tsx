import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SyncQueueCard } from '../src/components/sync/SyncQueueCard';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { TagPill } from '../src/components/ui/TagPill';
import { TextField } from '../src/components/ui/TextField';
import { DEFAULT_BACKEND_URL, GENERAL_TAG_ID } from '../src/constants/config';
import { colors } from '../src/constants/colors';
import { spacing } from '../src/constants/spacing';
import { useSettingsStore } from '../src/store/settingsStore';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';

const normalizeBackendUrl = (value: string): string => value.trim().replace(/\/+$/, '');

export default function SettingsScreen() {
  const router = useRouter();
  const tags = useTagsStore((state) => state.tags);
  const queueItems = useSyncStore((state) => state.items);
  const retryItem = useSyncStore((state) => state.retryItem);
  const retryAll = useSyncStore((state) => state.retryAll);
  const backendUrl = useSettingsStore((state) => state.backendUrl);
  const saveBackendUrl = useSettingsStore((state) => state.saveBackendUrl);

  const [backendUrlInput, setBackendUrlInput] = useState(backendUrl);
  const [isSavingBackendUrl, setIsSavingBackendUrl] = useState(false);

  useEffect(() => {
    setBackendUrlInput(backendUrl);
  }, [backendUrl]);

  const hasBackendUrlChanges = useMemo(
    () => normalizeBackendUrl(backendUrlInput) !== normalizeBackendUrl(backendUrl),
    [backendUrl, backendUrlInput],
  );

  const runSyncSafely = async (work: () => Promise<void>, title: string) => {
    try {
      await work();
    } catch (error) {
      Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
    }
  };

  const handleSaveBackendUrl = async () => {
    setIsSavingBackendUrl(true);

    try {
      await saveBackendUrl(backendUrlInput);
    } catch (error) {
      Alert.alert(
        'Backend-URL konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSavingBackendUrl(false);
    }
  };

  return (
    <Screen
      title="Settings"
      subtitle="Lokale Quelle, Push-only Synchronisierung."
      headerRight={<Button label="Schließen" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Backend" subtitle="Zentrale Konfiguration für Push-Requests" />
        <TextField
          label="Backend-URL"
          value={backendUrlInput}
          onChangeText={setBackendUrlInput}
          placeholder="https://example.com"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          helperText="Die URL wird für alle neuen Push-Requests verwendet."
        />
        <View style={styles.actionRow}>
          <Button
            label="Speichern"
            onPress={() => void handleSaveBackendUrl()}
            disabled={!hasBackendUrlChanges || isSavingBackendUrl}
          />
          <Button
            label="Standard"
            variant="secondary"
            onPress={() => setBackendUrlInput(DEFAULT_BACKEND_URL)}
            disabled={isSavingBackendUrl}
          />
        </View>
        <Text style={styles.meta}>Aktiv: {backendUrl}</Text>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Tags"
          subtitle="Allgemein bleibt geschützt, weitere Tags sind editierbar."
          action={<Button label="Neu" variant="secondary" onPress={() => router.push('/tag/new')} />}
        />
        {tags.length <= 1 ? (
          <EmptyState
            title="Nur Allgemein vorhanden"
            description="Lege weitere Tags an, um Aufgaben und freie Sessions farblich zu strukturieren."
          />
        ) : null}
        <View style={styles.list}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={() => router.push(`/tag/${tag.id}`)}
              style={styles.row}
            >
              <TagPill label={tag.name} color={tag.color} />
              <Text style={styles.rowMeta}>
                {tag.id === GENERAL_TAG_ID ? 'Standard' : 'Bearbeiten'}
              </Text>
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <SectionHeader
          title="Sync-Queue"
          subtitle="Fehlgeschlagene Pushes bleiben lokal sichtbar."
          action={
            <Button
              label="Alle senden"
              variant="secondary"
              onPress={() => void runSyncSafely(retryAll, 'Queue konnte nicht gesendet werden')}
            />
          }
        />
        {queueItems.length === 0 ? (
          <EmptyState
            title="Keine Queue-Einträge"
            description="Sobald Requests gesendet werden, erscheinen Status und Payload hier."
          />
        ) : (
          queueItems.map((item) => (
            <SyncQueueCard
              key={item.id}
              item={item}
              onRetry={() =>
                runSyncSafely(
                  () => retryItem(item.id),
                  'Eintrag konnte nicht erneut gesendet werden',
                )
              }
            />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
