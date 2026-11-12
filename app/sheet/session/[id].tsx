import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Button } from '../../../src/components/ui/Button';
import { Sheet } from '../../../src/components/ui/Sheet';
import { TagChips } from '../../../src/components/ui/TagChips';
import { TextField } from '../../../src/components/ui/TextField';
import { colors } from '../../../src/constants/colors';
import { useSheetClose } from '../../../src/hooks/useSheet';
import { useSessionsStore } from '../../../src/store/sessionsStore';
import { useTagsStore } from '../../../src/store/tagsStore';
import { themedStyles } from '../../../src/theme/runtime';
import { confirmAction } from '../../../src/utils/confirm';
import { formatShortDateLabel, formatTimeLabel } from '../../../src/utils/date';
import { haptics } from '../../../src/utils/haptics';
import { formatHoursClock } from '../../../src/utils/stats';

/** Ändert Name und Tag einer erfassten Session oder löscht sie. */
export default function SessionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sessionId = Array.isArray(id) ? id[0] : id;
  const close = useSheetClose();
  const tags = useTagsStore((state) => state.tags);
  // Stand beim Öffnen: Löscht oder ändert das Sheet die Session selbst, soll
  // sein Inhalt während des Schließens nicht mehr umspringen.
  const [session] = useState(
    () => useSessionsStore.getState().sessions.find((entry) => entry.id === sessionId) ?? null,
  );
  const updateSessionEntry = useSessionsStore((state) => state.updateSessionEntry);
  const deleteSessionEntry = useSessionsStore((state) => state.deleteSessionEntry);
  const [title, setTitle] = useState(session?.title ?? '');
  const [tagId, setTagId] = useState(session?.tagId ?? '');
  const [isSaving, setIsSaving] = useState(false);

  if (!session) {
    return (
      <Sheet title="Session bearbeiten">
        <Text style={styles.meta}>Diese Session existiert nicht mehr.</Text>
      </Sheet>
    );
  }

  const save = async () => {
    if (!title.trim() || !tagId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await updateSessionEntry(session.id, { title, tagId });
      haptics.success();
      close();
    } catch (error) {
      setIsSaving(false);
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  const remove = async () => {
    const confirmed = await confirmAction({
      title: 'Session löschen?',
      message: `„${session.title}“ wird aus der Statistik entfernt. Unter Einstellungen › Sync lässt sie sich wiederherstellen.`,
      confirmLabel: 'Löschen',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteSessionEntry(session.id);
      close();
    } catch (error) {
      Alert.alert(
        'Session konnte nicht gelöscht werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  return (
    <Sheet title="Session bearbeiten">
      <Text style={styles.meta}>
        {formatShortDateLabel(session.date)} · {formatTimeLabel(session.startTime)}–
        {formatTimeLabel(session.endTime)} · {formatHoursClock(session.durationMinutes)} Std.
      </Text>
      <TextField
        label="Name"
        value={title}
        onChangeText={setTitle}
        placeholder="Session benennen"
      />
      <View style={styles.tags}>
        <Text style={styles.label}>Tag</Text>
        <TagChips tags={tags} selectedTagId={tagId} onSelect={setTagId} />
      </View>
      <View style={styles.actions}>
        <View style={styles.action}>
          <Button label="Löschen" variant="danger" onPress={() => void remove()} />
        </View>
        <View style={styles.action}>
          <Button
            label="Sichern"
            onPress={() => void save()}
            disabled={!title.trim() || !tagId || isSaving}
          />
        </View>
      </View>
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  meta: {
    color: colors.textSecondary,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  tags: {
    gap: 8,
  },
  label: {
    paddingHorizontal: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
}));
