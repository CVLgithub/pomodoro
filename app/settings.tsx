import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { SyncQueueCard } from '../src/components/sync/SyncQueueCard';
import { Button } from '../src/components/ui/Button';
import { EmptyState } from '../src/components/ui/EmptyState';
import { Screen } from '../src/components/ui/Screen';
import { SectionCard } from '../src/components/ui/SectionCard';
import { SectionHeader } from '../src/components/ui/SectionHeader';
import { TagPill } from '../src/components/ui/TagPill';
import { BACKEND_URL, GENERAL_TAG_ID } from '../src/constants/config';
import { colors } from '../src/constants/colors';
import { spacing } from '../src/constants/spacing';
import { useSyncStore } from '../src/store/syncStore';
import { useTagsStore } from '../src/store/tagsStore';

export default function SettingsScreen() {
  const router = useRouter();
  const tags = useTagsStore((state) => state.tags);
  const queueItems = useSyncStore((state) => state.items);
  const retryItem = useSyncStore((state) => state.retryItem);
  const retryAll = useSyncStore((state) => state.retryAll);

  return (
    <Screen
      title="Settings"
      subtitle="Lokale Quelle, Push-only Synchronisierung."
      headerRight={<Button label="Schließen" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Backend" subtitle="Zentrale Konfiguration für Push-Requests" />
        <Text style={styles.value}>{BACKEND_URL}</Text>
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
          action={<Button label="Alle senden" variant="secondary" onPress={() => void retryAll()} />}
        />
        {queueItems.length === 0 ? (
          <EmptyState
            title="Keine Queue-Einträge"
            description="Sobald Requests gesendet werden, erscheinen Status und Payload hier."
          />
        ) : (
          queueItems.map((item) => (
            <SyncQueueCard key={item.id} item={item} onRetry={() => retryItem(item.id)} />
          ))
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  value: {
    color: colors.textPrimary,
    fontSize: 15,
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

