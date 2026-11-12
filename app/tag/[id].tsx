import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { ChoiceChips } from '../../src/components/ui/ChoiceChips';
import { ColorSwatchPicker } from '../../src/components/ui/ColorSwatchPicker';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { TextField } from '../../src/components/ui/TextField';
import { colors, tagPalette } from '../../src/constants/colors';
import { GENERAL_TAG_GROUP_ID, GENERAL_TAG_ID } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { useOpenSheet } from '../../src/hooks/useSheet';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
import { confirmAction } from '../../src/utils/confirm';
import { buildTagGroupOptions, getTagGroupKey } from '../../src/utils/tagGroups';

export default function TagDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tagId = Array.isArray(id) ? id[0] : id;
  const isNew = tagId === 'new';
  const tags = useTagsStore((state) => state.tags);
  const createTag = useTagsStore((state) => state.createTag);
  const updateTag = useTagsStore((state) => state.updateTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const tag = useMemo(() => tags.find((entry) => entry.id === tagId) ?? null, [tagId, tags]);
  const isGeneral = tag?.id === GENERAL_TAG_ID;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(tagPalette[0]);
  const [groupId, setGroupId] = useState<string>(GENERAL_TAG_GROUP_ID);
  const [isSaving, setIsSaving] = useState(false);
  const openSheet = useOpenSheet();
  const knownGroupIds = useRef<Set<string> | null>(null);

  // Nur beim Öffnen befüllen, damit ein Abgleich im Hintergrund keine Eingaben überschreibt.
  useEffect(() => {
    if (tag) {
      setName(tag.name);
      setColor(tag.color);
      setGroupId(getTagGroupKey(tag.groupId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag?.id]);

  // Eine über "Neue Gruppe" angelegte Gruppe wird nach der Rückkehr direkt gewählt.
  useEffect(() => {
    const known = knownGroupIds.current;
    if (!known) {
      return;
    }

    const createdGroup = tagGroups.find((group) => !known.has(group.id));
    if (createdGroup) {
      knownGroupIds.current = null;
      setGroupId(createdGroup.id);
    }
  }, [tagGroups]);

  const groupOptions = useMemo(
    () =>
      buildTagGroupOptions(tags, tagGroups).map((option) => ({
        value: option.key,
        label: option.label,
      })),
    [tagGroups, tags],
  );

  const reportError = (title: string) => (error: unknown) => {
    Alert.alert(title, error instanceof Error ? error.message : 'Unbekannter Fehler');
  };

  const save = async () => {
    if (!name.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        await createTag({ name, color, groupId });
      } else if (tag) {
        await updateTag(tag.id, isGeneral ? { color } : { name, color, groupId });
      }
      router.back();
    } catch (error) {
      reportError('Tag konnte nicht gespeichert werden')(error);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!tag || isGeneral) {
      return;
    }

    const confirmed = await confirmAction({
      title: `Tag „${tag.name}“ löschen?`,
      message: 'Zugehörige Aufgaben und Sessions werden „Allgemein“ zugeordnet.',
      confirmLabel: 'Löschen',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteTag(tag.id);
      router.back();
    } catch (error) {
      reportError('Tag konnte nicht gelöscht werden')(error);
    }
  };

  if (!isNew && !tag) {
    return (
      <Screen title="Tag" onBack={() => router.back()}>
        <EmptyState title="Tag nicht gefunden" description="Dieser Tag existiert nicht mehr." />
      </Screen>
    );
  }

  return (
    <Screen
      title={isNew ? 'Neuer Tag' : 'Tag'}
      subtitle={
        isGeneral
          ? '„Allgemein“ ist der Standard-Tag. Du kannst nur seine Farbe ändern.'
          : undefined
      }
      onBack={() => router.back()}
    >
      <SectionCard>
        <View style={styles.nameRow}>
          <View style={[styles.preview, { backgroundColor: color }]} />
          <View style={styles.nameField}>
            <TextField
              label="Name"
              value={name}
              editable={!isGeneral}
              onChangeText={setName}
              placeholder="Tag benennen"
              autoFocus={isNew}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Farbe</Text>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Gruppe</Text>
          <ChoiceChips
            options={groupOptions}
            selected={[groupId]}
            onToggle={setGroupId}
            disabled={isGeneral}
          />
          {isGeneral ? null : (
            <View style={styles.inlineAction}>
              <Button
                label="Neue Gruppe"
                variant="secondary"
                compact
                onPress={() => {
                  knownGroupIds.current = new Set(tagGroups.map((group) => group.id));
                  openSheet(routes.newGroupSheet);
                }}
              />
            </View>
          )}
        </View>
      </SectionCard>

      <View style={styles.actions}>
        {!isNew && !isGeneral ? (
          <View style={styles.action}>
            <Button label="Löschen" variant="danger" onPress={() => void remove()} />
          </View>
        ) : null}
        <View style={styles.action}>
          <Button label="Sichern" onPress={() => void save()} disabled={!name.trim() || isSaving} />
        </View>
      </View>
    </Screen>
  );
}

const styles = themedStyles(() => ({
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  preview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginBottom: 16,
  },
  nameField: {
    flex: 1,
  },
  field: {
    gap: 8,
  },
  label: {
    paddingHorizontal: 4,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  inlineAction: {
    alignSelf: 'flex-start',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  action: {
    flex: 1,
  },
}));
