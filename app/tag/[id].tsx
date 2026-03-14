import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { ColorSwatchPicker } from '../../src/components/ui/ColorSwatchPicker';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TagPill } from '../../src/components/ui/TagPill';
import { TextField } from '../../src/components/ui/TextField';
import { tagPalette } from '../../src/constants/colors';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { colors } from '../../src/constants/colors';
import { spacing } from '../../src/constants/spacing';
import { useTagsStore } from '../../src/store/tagsStore';

export default function TagDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tagId = Array.isArray(id) ? id[0] : id;
  const isNew = tagId === 'new';
  const tags = useTagsStore((state) => state.tags);
  const createTag = useTagsStore((state) => state.createTag);
  const updateTag = useTagsStore((state) => state.updateTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);
  const tag = useMemo(() => tags.find((entry) => entry.id === tagId) ?? null, [tagId, tags]);
  const isGeneral = tag?.id === GENERAL_TAG_ID;

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(tagPalette[0]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isNew) {
      setName('');
      setColor(tagPalette[0]);
      return;
    }

    if (tag) {
      setName(tag.name);
      setColor(tag.color);
    }
  }, [isNew, tag]);

  const handleSave = async () => {
    if (!name.trim() || isSaving) {
      return;
    }

    setIsSaving(true);
    try {
      if (isNew) {
        await createTag({ name, color });
      } else if (tag) {
        await updateTag(tag.id, { name, color });
      }
      router.back();
    } catch (error) {
      Alert.alert('Tag konnte nicht gespeichert werden', error instanceof Error ? error.message : 'Unbekannter Fehler');
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
      'Zugehörige Tasks und Sessions werden auf Allgemein umgehängt.',
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
      <Screen title="Tag" subtitle="Eintrag nicht gefunden" headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}>
        <SectionCard>
          <Text style={{ color: colors.textSecondary }}>Der angeforderte Tag existiert nicht mehr.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={isNew ? 'Neuer Tag' : 'Tag'}
      subtitle={isGeneral ? 'Allgemein bleibt erhalten und ist nicht löschbar.' : 'Name und Farbe frei anpassbar.'}
      headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Vorschau" />
        <TagPill label={name.trim() || 'Tag'} color={color} />
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

        <View style={{ gap: spacing.sm }}>
          <Text style={styles.label}>Farbe</Text>
          <ColorSwatchPicker value={color} onChange={setColor} />
        </View>
      </SectionCard>

      <SectionCard>
        <View style={styles.actions}>
          <Button label="Speichern" onPress={handleSave} disabled={!name.trim() || isSaving || isGeneral} />
          <Button
            label={isNew ? 'Abbrechen' : 'Löschen'}
            variant={isNew ? 'ghost' : 'danger'}
            onPress={handleDelete}
            disabled={isGeneral}
          />
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
