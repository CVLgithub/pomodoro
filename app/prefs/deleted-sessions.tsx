import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { ListGroup, ListRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { formatShortDateLabel } from '../../src/utils/date';
import { formatMinutesLong } from '../../src/utils/duration';

export default function DeletedSessionsScreen() {
  const router = useRouter();
  const deletedSessions = useSessionsStore((state) => state.deletedSessions);
  const restoreSessionEntry = useSessionsStore((state) => state.restoreSessionEntry);
  const tags = useTagsStore((state) => state.tags);
  const tagsById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);

  const restore = (sessionId: string) => {
    void restoreSessionEntry(sessionId).catch((error) => {
      Alert.alert(
        'Session konnte nicht wiederhergestellt werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    });
  };

  return (
    <Screen title="Gelöschte Sessions" onBack={() => router.back()}>
      {deletedSessions.length === 0 ? (
        <EmptyState
          title="Keine gelöschten Sessions"
          description="Eine in der Statistik gelöschte Session lässt sich hier wiederherstellen."
        />
      ) : (
        <ListGroup footer="Wiederhergestellte Sessions zählen wieder in der Statistik mit, auch auf anderen Geräten.">
          {deletedSessions.map((session, index) => {
            const tag = tagsById.get(session.tagId);

            return (
              <ListRow
                key={session.id}
                label={session.title}
                detail={[
                  formatShortDateLabel(session.date),
                  formatMinutesLong(session.durationMinutes),
                  tag?.name,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                dotColor={tag?.color}
                separated={index > 0}
                right={
                  <Button
                    label="Zurückholen"
                    variant="secondary"
                    compact
                    onPress={() => restore(session.id)}
                  />
                }
              />
            );
          })}
        </ListGroup>
      )}
    </Screen>
  );
}
