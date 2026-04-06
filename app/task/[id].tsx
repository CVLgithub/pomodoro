import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TaskDateField } from '../../src/components/tasks/TaskDateField';
import { Button } from '../../src/components/ui/Button';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TagPill } from '../../src/components/ui/TagPill';
import { TextField } from '../../src/components/ui/TextField';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { colors } from '../../src/constants/colors';
import { spacing } from '../../src/constants/spacing';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  const isNew = taskId === 'new';
  const tasks = useTasksStore((state) => state.tasks);
  const tags = useTagsStore((state) => state.tags);
  const createTask = useTasksStore((state) => state.createTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const task = useMemo(() => tasks.find((entry) => entry.id === taskId) ?? null, [taskId, tasks]);

  const [title, setTitle] = useState('');
  const [selectedTagId, setSelectedTagId] = useState(GENERAL_TAG_ID);
  const [date, setDate] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!task && isNew) {
      setTitle('');
      setSelectedTagId(GENERAL_TAG_ID);
      setDate(null);
      setIsCompleted(false);
      return;
    }

    if (task) {
      setTitle(task.title);
      setSelectedTagId(task.tagId);
      setDate(task.date);
      setIsCompleted(task.isCompleted);
    }
  }, [isNew, task]);

  const selectedTag = tags.find((tag) => tag.id === selectedTagId);

  const handleSave = async () => {
    if (!title.trim() || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (isNew) {
        await createTask({ title, tagId: selectedTagId, date });
      } else if (task) {
        await updateTask(task.id, { title, tagId: selectedTagId, date, isCompleted });
      }

      router.back();
    } catch (error) {
      Alert.alert(
        'Speichern fehlgeschlagen',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (isNew || !task) {
      router.back();
      return;
    }

    Alert.alert(
      'Aufgabe löschen?',
      'Diese Aktion entfernt die Aufgabe lokal und pusht ein Delete-Tombstone.',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            router.replace('/(tabs)/tasks');
          },
        },
      ],
    );
  };

  if (!isNew && !task) {
    return (
      <Screen
        title="Aufgabe"
        subtitle="Eintrag nicht gefunden"
        headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
      >
        <SectionCard>
          <Text style={styles.missingCopy}>Die angeforderte Aufgabe existiert nicht mehr.</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={isNew ? 'Neue Aufgabe' : 'Aufgabe'}
      subtitle="Titel ist Pflicht, Datum optional."
      headerRight={<Button label="Zurück" variant="ghost" onPress={() => router.back()} />}
    >
      <SectionCard>
        <SectionHeader title="Details" />
        <TextField
          label="Titel"
          value={title}
          onChangeText={setTitle}
          placeholder="Aufgabe benennen"
        />

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Tag</Text>
          <Pressable style={styles.selector} onPress={() => setShowTagPicker(true)}>
            {selectedTag ? <TagPill label={selectedTag.name} color={selectedTag.color} /> : null}
            <Text style={styles.link}>Wählen</Text>
          </Pressable>
        </View>

        <TaskDateField
          date={date}
          isPickerVisible={showDatePicker}
          onTogglePicker={() => setShowDatePicker((value) => !value)}
          onChangeDate={setDate}
        />

        {!isNew ? (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Status</Text>
            <View style={styles.rowActions}>
              <Button
                label={isCompleted ? 'Wieder öffnen' : 'Als erledigt markieren'}
                variant="secondary"
                onPress={() => setIsCompleted((value) => !value)}
              />
            </View>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard>
        <View style={styles.rowActions}>
          <Button
            label="Speichern"
            onPress={handleSave}
            disabled={!title.trim() || isSaving}
          />
          <Button
            label={isNew ? 'Abbrechen' : 'Löschen'}
            variant={isNew ? 'ghost' : 'danger'}
            onPress={handleDelete}
          />
        </View>
      </SectionCard>

      <ModalSheet
        visible={showTagPicker}
        title="Tag wählen"
        onClose={() => setShowTagPicker(false)}
      >
        <View style={styles.modalList}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              style={styles.modalRow}
              onPress={() => {
                setSelectedTagId(tag.id);
                setShowTagPicker(false);
              }}
            >
              <TagPill label={tag.name} color={tag.color} />
            </Pressable>
          ))}
        </View>
      </ModalSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  missingCopy: {
    color: colors.textSecondary,
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  link: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  rowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  modalList: {
    gap: spacing.sm,
  },
  modalRow: {
    paddingVertical: spacing.sm,
  },
});
