import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { SyncQueueItem } from '../../types/sync';
import { copyToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';
import { SectionCard } from '../ui/SectionCard';

interface SyncQueueCardProps {
  item: SyncQueueItem;
  onRetry: () => Promise<void> | void;
}

const ENTITY_LABELS: Record<SyncQueueItem['entityType'], string> = {
  task: 'Aufgabe',
  tag: 'Tag',
  tagGroups: 'Gruppen',
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
          <Text style={styles.meta}>Wird erneut gesendet</Text>
        </View>
        <Button label="Erneut senden" variant="secondary" onPress={() => void onRetry()} />
      </View>
      {item.errorMessage ? <Text style={styles.error}>{item.errorMessage}</Text> : null}
      <View style={styles.controls}>
        <Pressable onPress={() => setExpanded((value) => !value)}>
          <Text style={styles.link}>{expanded ? 'Details ausblenden' : 'Details anzeigen'}</Text>
        </Pressable>
        <Pressable onPress={() => void copyToClipboard(item.payloadJson)}>
          <Text style={styles.link}>Details kopieren</Text>
        </Pressable>
      </View>
      {expanded ? (
        <View style={styles.payloadWrap}>
          <Text style={styles.payload}>{item.payloadJson}</Text>
        </View>
      ) : null}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  payloadWrap: {
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    padding: spacing.md,
  },
  payload: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
