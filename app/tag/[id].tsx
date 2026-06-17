import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { ColorSwatchPicker } from '../../src/components/ui/ColorSwatchPicker';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TagPill } from '../../src/components/ui/TagPill';
import { TextField } from '../../src/components/ui/TextField';
import { tagPalette } from '../../src/constants/colors';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { colors } from '../../src/constants/colors';
import { radii, spacing } from '../../src/constants/spacing';
import { syncManager } from '../../src/services/sync/syncManager';
import { toTagGroupsPushPayload } from '../../src/services/sync/payloads';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useTagsStore } from '../../src/store/tagsStore';
import {
  buildTagGroupOptions,
  getTagGroupKey,
  getTagGroupLabel,
  normalizeCustomTagGroupName,
} from '../../src/utils/tagGroups';

type CreateMode = 'tag' | 'group';

export default function TagDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tagId = Array.isArray(id) ? id[0] : id;
  const isNew = tagId === 'new';
  const tags = useTagsStore((state) => state.tags);
  const createTag = useTagsStore((state) => state.createTag);
  const updateTag = useTagsStore((state) => state.updateTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);
  const savedTagGroups = useSettingsStore((state) => state.tagGroups);
  const createTagGroup = useSettingsStore((state) => state.createTagGroup);
  const tag = useMemo(() => tags.find((entry) => entry.id === tagId) ?? null, [tagId, tags]);
  const isGeneral = tag?.id === GENERAL_TAG_ID;

  const [createMode, setCreateMode] = useState<CreateMode>('tag');
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(tagPalette[0]);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const tagGroupOptions = useMemo(
    () => buildTagGroupOptions(tags, savedTagGroups),
    [savedTagGroups, tags],
  );
  const selectedGroupLabel = getTagGroupLabel(groupName);
  const selectedGroupKey = getTagGroupKey(groupName);
  const normalizedNewGroupName = normalizeCustomTagGroupName(newGroupName);
  const newGroupAlreadyExists = normalizedNewGroupName
    ? tagGroupOptions.some(
        (option) =>
          option.label.localeCompare(normalizedNewGroupName, 'de-DE', {
            sensitivity: 'base',
          }) === 0,
      )
    : false;
  const canCreateGroup = Boolean(normalizedNewGroupName) && !newGroupAlreadyExists && !isSaving;

  useEffect(() => {
    if (isNew) {
      setCreateMode('tag');
      setName('');
      setColor(tagPalette[0]);
      setGroupName(null);
      setNewGroupName('');
      setShowGroupPicker(false);
      return;
    }

    if (tag) {
      setCreateMode('tag');
      setName(tag.name);
      setColor(tag.color);
      setGroupName(tag.groupName);
      setNewGroupName('');
      setShowGroupPicker(false);
    }
  }, [isNew, tag]);

  const handleCreateGroup = async () => {
    if (!normalizedNewGroupName || newGroupAlreadyExists || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      await createTagGroup(normalizedNewGroupName);
      await syncManager
        .pushTagGroups(toTagGroupsPushPayload(useSettingsStore.getState().tagGroups))
        .catch(() => undefined);
      await useSyncStore.getState().loadQueue();
      router.back();
    } catch (error) {
      Alert.alert(
        'Gruppe konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (createMode === 'group') {
      await handleCreateGroup();
      return;
    }

    if (!name.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        await createTag({ name, color, groupName });
      } else if (tag) {
        await updateTag(tag.id, { name, color, groupName });
      }
      router.back();
    } catch (error) {
      Alert.alert(
        'Tag konnte nicht gespeichert werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (isNew || !tag || isGeneral) {
      router.back();
      return;
    }

    Alert.alert(
      'Tag löschen?',
      'Zugehörige Aufgaben und Sessions werden auf Allgemein umgehängt.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await deleteTag(tag.id);
            router.replace('/settings');
          },
        },
      ],
    );
  };

  if (!isNew && !tag) {
    return (
      <Screen
        title="Tag"
        subtitle="Eintrag nicht gefunden"
        headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
      >
        <SectionCard>
          <Text style={{ color: colors.textSecondary }}>Der angeforderte Tag existiert nicht mehr.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={isNew && createMode === 'group' ? 'Neue Gruppe' : isNew ? 'Neuer Tag' : 'Tag'}
      subtitle={
        isGeneral
          ? 'Allgemein bleibt erhalten und ist nicht löschbar.'
          : createMode === 'group'
            ? 'Erstelle eine Gruppe, der du später Tags zuordnen kannst.'
            : 'Passe Name, Farbe und Gruppe an.'
      }
      headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
    >
      {isNew ? (
        <SectionCard>
          <SectionHeader title="Erstellen" />
          <View style={styles.modeToggle}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCreateMode('tag')}
              style={[styles.modeButton, createMode === 'tag' ? styles.modeButtonActive : null]}
            >
              <Text
                style={[
                  styles.modeButtonLabel,
                  createMode === 'tag' ? styles.modeButtonLabelActive : null,
                ]}
              >
                Tag
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => setCreateMode('group')}
              style={[styles.modeButton, createMode === 'group' ? styles.modeButtonActive : null]}
            >
              <Text
                style={[
                  styles.modeButtonLabel,
                  createMode === 'group' ? styles.modeButtonLabelActive : null,
                ]}
              >
                Gruppe
              </Text>
            </Pressable>
          </View>
        </SectionCard>
      ) : null}

      {createMode === 'tag' ? (
        <>
          <SectionCard>
            <SectionHeader title="Vorschau" />
            <TagPill label={name.trim() || 'Tag'} color={color} />
            <Text style={styles.groupPreview}>Gruppe: {selectedGroupLabel}</Text>
          </SectionCard>

          <SectionCard>
            <SectionHeader title="Details" />
            <TextField
              label="Name"
              value={name}
              editable={!isGeneral}
              onChangeText={setName}
              placeholder="Tag benennen"
              helperText={isGeneral ? 'Der Standard-Tag bleibt unverändert benannt.' : undefined}
            />

            <View style={styles.fieldBlock}>
              <Text style={styles.label}>Tag-Gruppe</Text>
              <Pressable
                disabled={isGeneral}
                onPress={() => setShowGroupPicker(true)}
                style={[styles.selector, isGeneral ? styles.selectorDisabled : null]}
              >
                <Text style={styles.selectorValue}>{selectedGroupLabel}</Text>
                {!isGeneral ? <Text style={styles.selectorAction}>Wählen</Text> : null}
              </Pressable>
              <Text style={styles.helperText}>
                Neue Gruppen legst du oben im Modus Gruppe an.
              </Text>
            </View>

            <View style={{ gap: spacing.sm }}>
              <Text style={styles.label}>Farbe</Text>
              <ColorSwatchPicker value={color} onChange={setColor} />
            </View>
          </SectionCard>
        </>
      ) : (
        <SectionCard>
          <SectionHeader title="Gruppe erstellen" />
          <TextField
            label="Name"
            value={newGroupName}
            onChangeText={setNewGroupName}
            placeholder="z. B. Arbeit"
            helperText="Die Gruppe erscheint danach in der Tag-Auswahl, auch wenn sie noch leer ist."
          />
          {newGroupName.trim() && !normalizedNewGroupName ? (
            <Text style={styles.warningText}>Allgemein ist bereits die Standardgruppe.</Text>
          ) : null}
          {newGroupAlreadyExists ? (
            <Text style={styles.warningText}>Diese Gruppe existiert bereits.</Text>
          ) : null}
        </SectionCard>
      )}

      <SectionCard>
        <View style={styles.actions}>
          <Button
            label={createMode === 'group' ? 'Gruppe erstellen' : 'Speichern'}
            onPress={() => void handleSave()}
            disabled={
              createMode === 'group'
                ? !canCreateGroup
                : !name.trim() || isSaving || isGeneral
            }
          />
          <Button
            label={isNew ? 'Abbrechen' : 'Löschen'}
            variant={isNew ? 'ghost' : 'danger'}
            onPress={handleDelete}
            disabled={isGeneral}
          />
        </View>
      </SectionCard>

      <ModalSheet
        visible={showGroupPicker}
        title="Gruppe wählen"
        onClose={() => setShowGroupPicker(false)}
      >
        <View style={styles.modalList}>
          {tagGroupOptions.map((option) => {
            const isSelected = option.key === selectedGroupKey;

            return (
              <Pressable
                key={option.key}
                onPress={() => {
                  setGroupName(option.value);
                  setShowGroupPicker(false);
                }}
                style={styles.modalRow}
              >
                <View style={styles.modalRowCopy}>
                  <Text style={styles.modalRowTitle}>{option.label}</Text>
                  {option.value === null ? (
                    <Text style={styles.modalRowMeta}>Standardgruppe</Text>
                  ) : null}
                </View>
                {isSelected ? <Text style={styles.modalSelected}>Ausgewählt</Text> : null}
              </Pressable>
            );
          })}
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeToggle: {
    flexDirection: 'row',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
  },
  modeButtonActive: {
    backgroundColor: colors.accent,
  },
  modeButtonLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  modeButtonLabelActive: {
    color: colors.background,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  selector: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  selectorDisabled: {
    opacity: 0.65,
  },
  selectorValue: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  selectorAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  groupPreview: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  warningText: {
    color: colors.warning,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  modalList: {
    gap: spacing.sm,
  },
  modalRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalRowCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  modalRowTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalRowMeta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  modalSelected: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
