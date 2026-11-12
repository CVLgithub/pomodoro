import { useState } from 'react';
import { Alert, Text, View } from 'react-native';

import { Button } from '../../src/components/ui/Button';
import { Sheet } from '../../src/components/ui/Sheet';
import { TagChips } from '../../src/components/ui/TagChips';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { FREE_SESSION_TITLE, GENERAL_TAG_ID } from '../../src/constants/config';
import { useSheetClose } from '../../src/hooks/useSheet';
import { useSessionsStore } from '../../src/store/sessionsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
import { addMinutes, formatDateKey, formatTimeLabel, toLocalIsoString } from '../../src/utils/date';
import { haptics } from '../../src/utils/haptics';
import { validateManualSession } from '../../src/utils/sessionInput';

const buildDefaults = () => {
  const now = new Date();

  return {
    title: FREE_SESSION_TITLE,
    date: formatDateKey(now),
    startTime: formatTimeLabel(addMinutes(now, -25)),
    endTime: formatTimeLabel(now),
    tagId: GENERAL_TAG_ID,
  };
};

/** Trägt eine bereits abgeschlossene Session nach. */
export default function ManualSessionSheet() {
  const close = useSheetClose();
  const tags = useTagsStore((state) => state.tags);
  const createSessionEntry = useSessionsStore((state) => state.createSessionEntry);
  const [draft, setDraft] = useState(buildDefaults);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const update = (patch: Partial<typeof draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const save = async () => {
    const result = validateManualSession(draft);

    if ('error' in result) {
      setError(result.error);
      return;
    }

    setIsSaving(true);

    try {
      await createSessionEntry({
        title: draft.title.trim(),
        date: draft.date,
        startTime: toLocalIsoString(result.start),
        endTime: toLocalIsoString(result.end),
        tagId: draft.tagId,
      });
      haptics.success();
      close();
    } catch (saveError) {
      setIsSaving(false);
      Alert.alert(
        'Session konnte nicht gespeichert werden',
        saveError instanceof Error ? saveError.message : 'Unbekannter Fehler',
      );
    }
  };

  return (
    <Sheet title="Session nachtragen">
      <TextField
        label="Name"
        value={draft.title}
        onChangeText={(title) => update({ title })}
        placeholder="Was hast du gemacht?"
      />
      <View style={styles.row}>
        <View style={styles.dateField}>
          <TextField
            label="Datum"
            value={draft.date}
            onChangeText={(date) => update({ date })}
            placeholder="2026-04-04"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.timeField}>
          <TextField
            label="Start"
            value={draft.startTime}
            onChangeText={(startTime) => update({ startTime })}
            placeholder="09:00"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        <View style={styles.timeField}>
          <TextField
            label="Ende"
            value={draft.endTime}
            onChangeText={(endTime) => update({ endTime })}
            placeholder="09:25"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>
      <View style={styles.tags}>
        <Text style={styles.label}>Tag</Text>
        <TagChips tags={tags} selectedTagId={draft.tagId} onSelect={(tagId) => update({ tagId })} />
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Session hinzufügen" onPress={() => void save()} disabled={isSaving} />
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  dateField: {
    flex: 1.5,
  },
  timeField: {
    flex: 1,
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
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
}));
