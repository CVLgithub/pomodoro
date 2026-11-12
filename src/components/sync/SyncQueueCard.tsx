import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';
import { SyncQueueItem } from '../../types/sync';
import { copyToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';
import { SectionCard } from '../ui/SectionCard';

interface SyncQueueCardProps {
  item: SyncQueueItem;
  /** Ohne `onRetry` zeigt die Karte den Eintrag nur an. */
  onRetry?: () => Promise<void> | void;
}

const ENTITY_LABELS: Record<SyncQueueItem['entityType'], string> = {
  task: 'Aufgabe',
  tag: 'Tag',
  tagGroup: 'Gruppe',
  session: 'Session',
};

const STATUS_LABELS: Record<SyncQueueItem['status'], string> = {
  pending: 'wartet',
  failed: 'fehlgeschlagen',
  synced: 'gesendet',
};

export const SyncQueueCard = ({ item, onRetry }: SyncQueueCardProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <SectionCard>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {ENTITY_LABELS[item.entityType]} · {STATUS_LABELS[item.status]}
          </Text>
          <Text style={styles.meta}>
            {item.retryCount === 1 ? '1 Versuch' : `${item.retryCount} Versuche`} · zuletzt{' '}
            {new Date(item.updatedAt).toLocaleString('de-DE', {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </Text>
        </View>
        {onRetry ? (
          <Button label="Erneut senden" variant="secondary" compact onPress={() => void onRetry()} />
        ) : null}
      </View>
      {item.errorMessage ? <Text style={styles.error}>{item.errorMessage}</Text> : null}
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={styles.linkArea}
        >
          <Text style={styles.link}>{expanded ? 'Details ausblenden' : 'Details anzeigen'}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void copyToClipboard(item.payloadJson)}
          style={styles.linkArea}
        >
          <Text style={styles.link}>Details kopieren</Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.payloadWrap}>
          <Text style={styles.payload} selectable>
            {item.payloadJson}
          </Text>
        </View>
      ) : null}
    </SectionCard>
  );
};

const styles = themedStyles(() => ({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    gap: 20,
  },
  linkArea: {
    minHeight: 44,
    justifyContent: 'center',
  },
  link: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  payloadWrap: {
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    padding: 12,
  },
  payload: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
}));
