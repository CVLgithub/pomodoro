import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { SyncQueueCard } from '../../src/components/sync/SyncQueueCard';
import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ListGroup, ListRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { useSyncStore } from '../../src/store/syncStore';

export default function SyncQueueScreen() {
  const router = useRouter();
  const items = useSyncStore((state) => state.items);
  const retryItem = useSyncStore((state) => state.retryItem);
  const retryAll = useSyncStore((state) => state.retryAll);
  const [showSent, setShowSent] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const open = useMemo(() => items.filter((item) => item.status !== 'synced'), [items]);
  const sent = useMemo(() => items.filter((item) => item.status === 'synced'), [items]);
  const failedCount = open.filter((item) => item.status === 'failed').length;

  const run = async (work: () => Promise<void>) => {
    setIsRetrying(true);
    try {
      await work();
    } catch (error) {
      Alert.alert(
        'Senden fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Screen title="Übertragungen" onBack={() => router.back()}>
      {open.length === 0 ? (
        <EmptyState
          title="Nichts ausstehend"
          description="Alle Änderungen sind beim Server angekommen."
        />
      ) : null}

      {failedCount > 1 ? (
        <Button
          label={`Alle ${failedCount} erneut senden`}
          onPress={() => void run(retryAll)}
          disabled={isRetrying}
        />
      ) : null}

      {open.map((item) => (
        <SyncQueueCard
          key={item.id}
          item={item}
          onRetry={item.status === 'failed' ? () => run(() => retryItem(item.id)) : undefined}
        />
      ))}

      {sent.length > 0 ? (
        <ListGroup>
          <ListRow
            label="Bereits gesendet"
            value={`${sent.length} ${showSent ? '· ausblenden' : '· anzeigen'}`}
            tone="action"
            onPress={() => setShowSent((value) => !value)}
          />
        </ListGroup>
      ) : null}
      {showSent ? sent.map((item) => <SyncQueueCard key={item.id} item={item} />) : null}
    </Screen>
  );
}
