import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { TaskDateField } from '../../src/components/tasks/TaskDateField';
import { Button } from '../../src/components/ui/Button';
import { ColorSwatchPicker } from '../../src/components/ui/ColorSwatchPicker';
import { ModalSheet } from '../../src/components/ui/ModalSheet';
import { Screen } from '../../src/components/ui/Screen';
import { SectionCard } from '../../src/components/ui/SectionCard';
import { SectionHeader } from '../../src/components/ui/SectionHeader';
import { TagPill } from '../../src/components/ui/TagPill';
import { TextField } from '../../src/components/ui/TextField';
import { GENERAL_TAG_ID } from '../../src/constants/config';
import { colors, tagPalette } from '../../src/constants/colors';
import { spacing } from '../../src/constants/spacing';
import { syncManager } from '../../src/services/sync/syncManager';
import { toTagGroupsPushPayload } from '../../src/services/sync/payloads';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useSyncStore } from '../../src/store/syncStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { useTasksStore } from '../../src/store/tasksStore';
import { Tag } from '../../src/types/tag';
import { TaskRecurrenceType, TaskWeekday } from '../../src/types/task';
import {
  formatFullDateLabel,
  formatTimeLabel,
  getTodayDateKey,
  parseDateKey,
} from '../../src/utils/date';
import {
  getDefaultTaskRecurrenceDays,
  getTaskWeekdayLabel,
  sortTaskWeekdays,
  TASK_WEEKDAY_ORDER,
} from '../../src/utils/taskRecurrence';
import {
  buildTagGroupOptions,
  getTagGroupKey,
  normalizeCustomTagGroupName,
  sortTagsByGroupAndName,
} from '../../src/utils/tagGroups';

type TagPickerMode = 'list' | 'tag' | 'group';

type TagPickerGroup = {
  key: string;
  label: string;
  tags: Tag[];
};

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  const isNew = taskId === 'new';
  const tasks = useTasksStore((state) => state.tasks);
  const occurrenceCompletions = useTasksStore((state) => state.occurrenceCompletions);
  const tags = useTagsStore((state) => state.tags);
  const createTag = useTagsStore((state) => state.createTag);
  const savedTagGroups = useSettingsStore((state) => state.tagGroups);
  const createTagGroup = useSettingsStore((state) => state.createTagGroup);
  const createTask = useTasksStore((state) => state.createTask);
  const updateTask = useTasksStore((state) => state.updateTask);
  const deleteTask = useTasksStore((state) => state.deleteTask);
  const task = useMemo(
    () => tasks.find((entry) => entry.id === taskId) ?? null,
    [taskId, tasks],
  );

  const [title, setTitle] = useState('');
  const [selectedTagId, setSelectedTagId] = useState(GENERAL_TAG_ID);
  const [date, setDate] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<TaskRecurrenceType>('none');
  const [recurrenceDays, setRecurrenceDays] = useState<TaskWeekday[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagPickerMode, setTagPickerMode] = useState<TagPickerMode>('list');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(tagPalette[0]);
  const [newTagGroupName, setNewTagGroupName] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isTagPickerSaving, setIsTagPickerSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!task && isNew) {
      setTitle('');
      setSelectedTagId(GENERAL_TAG_ID);
      setDate(null);
      setIsCompleted(false);
      setRecurrenceType('none');
      setRecurrenceDays([]);
      return;
    }

    if (task) {
      setTitle(task.title);
      setSelectedTagId(task.tagId);
      setDate(task.date);
      setIsCompleted(task.isCompleted);
      setRecurrenceType(task.recurrenceType);
      setRecurrenceDays(task.recurrenceDays);
    }
  }, [isNew, task]);

  const selectedTag = tags.find((tag) => tag.id === selectedTagId);
  const tagGroupOptions = useMemo(
    () => buildTagGroupOptions(tags, savedTagGroups),
    [savedTagGroups, tags],
  );
  const selectedNewTagGroupKey = getTagGroupKey(newTagGroupName);
  const tagPickerGroups = useMemo<TagPickerGroup[]>(() => {
    const tagsByGroupKey = new Map<string, Tag[]>();

    sortTagsByGroupAndName(tags).forEach((tag) => {
      const groupKey = getTagGroupKey(tag.groupName);
      const groupTags = tagsByGroupKey.get(groupKey) ?? [];

      groupTags.push(tag);
      tagsByGroupKey.set(groupKey, groupTags);
    });

    return tagGroupOptions.map((option) => ({
      key: option.key,
      label: option.label,
      tags: tagsByGroupKey.get(option.key) ?? [],
    }));
  }, [tagGroupOptions, tags]);
  const normalizedNewGroupName = normalizeCustomTagGroupName(newGroupName);
  const newGroupAlreadyExists = normalizedNewGroupName
    ? tagGroupOptions.some(
        (option) =>
          option.label.localeCompare(normalizedNewGroupName, 'de-DE', {
            sensitivity: 'base',
          }) === 0,
      )
    : false;
  const canCreateTag = Boolean(newTagName.trim()) && !isTagPickerSaving;
  const canCreateGroup =
    Boolean(normalizedNewGroupName) && !newGroupAlreadyExists && !isTagPickerSaving;
  const isRecurring = recurrenceType === 'weekly';
  const recurringCompletionHistory = useMemo(() => {
    if (!taskId) {
      return [];
    }

    return occurrenceCompletions
      .filter((entry) => entry.taskId === taskId)
      .sort((left, right) => right.date.localeCompare(left.date));
  }, [occurrenceCompletions, taskId]);

  useEffect(() => {
    if (!showTagPicker) {
      return;
    }

    setTagPickerMode('list');
    setNewTagName('');
    setNewTagColor(tagPalette[0]);
    setNewTagGroupName(selectedTag?.groupName ?? null);
    setNewGroupName('');
    setIsTagPickerSaving(false);
  }, [selectedTag?.groupName, showTagPicker]);

  const handleEnableRecurring = () => {
    const nextDate = date ?? getTodayDateKey();

    setRecurrenceType('weekly');
    setDate(nextDate);
    setIsCompleted(false);
    setRecurrenceDays((current) =>
      current.length > 0 ? current : getDefaultTaskRecurrenceDays(nextDate),
    );
  };

  const handleDisableRecurring = () => {
    setRecurrenceType('none');
    setRecurrenceDays([]);
  };

  const toggleRecurrenceDay = (day: TaskWeekday) => {
    setRecurrenceDays((current) => {
      const nextDays = current.includes(day)
        ? current.filter((entry) => entry !== day)
        : [...current, day];

      return sortTaskWeekdays(nextDays);
    });
  };

  const handleCreateTagFromPicker = async () => {
    if (!newTagName.trim() || isTagPickerSaving) {
      return;
    }

    setIsTagPickerSaving(true);

    try {
      const createdTag = await createTag({
        name: newTagName,
        color: newTagColor,
        groupName: newTagGroupName,
      });

      setSelectedTagId(createdTag.id);
      setShowTagPicker(false);
    } catch (error) {
      Alert.alert(
        'Tag konnte nicht erstellt werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsTagPickerSaving(false);
    }
  };

  const handleCreateGroupFromPicker = async () => {
    if (!normalizedNewGroupName || newGroupAlreadyExists || isTagPickerSaving) {
      return;
    }

    setIsTagPickerSaving(true);

    try {
      const createdGroupName = await createTagGroup(normalizedNewGroupName);

      await syncManager
        .pushTagGroups(toTagGroupsPushPayload(useSettingsStore.getState().tagGroups))
        .catch(() => undefined);
      await useSyncStore.getState().loadQueue();

      setNewGroupName('');
      setNewTagGroupName(createdGroupName);
      setTagPickerMode('tag');
    } catch (error) {
      Alert.alert(
        'Gruppe konnte nicht erstellt werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    } finally {
      setIsTagPickerSaving(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      if (isRecurring && !date) {
        throw new Error('Wiederholende Aufgaben brauchen ein Startdatum.');
      }

      if (isRecurring && recurrenceDays.length === 0) {
        throw new Error('Wähle mindestens einen Wochentag aus.');
      }

      if (isNew) {
        await createTask({
          title,
          tagId: selectedTagId,
          date,
          recurrenceType,
          recurrenceDays,
        });
      } else if (task) {
        await updateTask(task.id, {
          title,
          tagId: selectedTagId,
          date,
          isCompleted,
          recurrenceType,
          recurrenceDays,
        });
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
      'Diese Aufgabe wird entfernt.',
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
          <Text style={styles.missingCopy}>
            Die angeforderte Aufgabe existiert nicht mehr.
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={isNew ? 'Neue Aufgabe' : 'Aufgabe'}
      subtitle="Titel ist Pflicht, Datum oder Wiederholung optional."
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

        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Wiederholung</Text>
          <View style={styles.optionRow}>
            <Pressable
              style={[styles.optionChip, !isRecurring ? styles.optionChipActive : null]}
              onPress={handleDisableRecurring}
            >
              <Text
                style={[
                  styles.optionChipLabel,
                  !isRecurring ? styles.optionChipLabelActive : null,
                ]}
              >
                Einmalig
              </Text>
            </Pressable>
            <Pressable
              style={[styles.optionChip, isRecurring ? styles.optionChipActive : null]}
              onPress={handleEnableRecurring}
            >
              <Text
                style={[
                  styles.optionChipLabel,
                  isRecurring ? styles.optionChipLabelActive : null,
                ]}
              >
                Wiederholend
              </Text>
            </Pressable>
          </View>

          {isRecurring ? (
            <View style={styles.recurrenceBlock}>
              <Text style={styles.helperCopy}>
                Wähle die Wochentage, an denen diese Aufgabe erscheinen soll.
              </Text>
              <View style={styles.weekdayRow}>
                {TASK_WEEKDAY_ORDER.map((day) => {
                  const isSelected = recurrenceDays.includes(day);

                  return (
                    <Pressable
                      key={day}
                      style={[
                        styles.weekdayChip,
                        isSelected ? styles.weekdayChipActive : null,
                      ]}
                      onPress={() => toggleRecurrenceDay(day)}
                    >
                      <Text
                        style={[
                          styles.weekdayChipLabel,
                          isSelected ? styles.weekdayChipLabelActive : null,
                        ]}
                      >
                        {getTaskWeekdayLabel(day)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.helperCopy}>
                Im Aufgaben-Screen erscheint die Aufgabe nur einmal. Heute und Kalender
                zeigen die passenden Tage.
              </Text>
            </View>
          ) : null}
        </View>

        <TaskDateField
          date={date}
          isPickerVisible={showDatePicker}
          onTogglePicker={() => setShowDatePicker((value) => !value)}
          onChangeDate={setDate}
          label={isRecurring ? 'Startdatum' : 'Datum'}
        />

        {!isNew ? (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Status</Text>
            {isRecurring ? (
              <Text style={styles.helperCopy}>
                Wiederholende Aufgaben werden pro Tag in Heute und Kalender erledigt.
              </Text>
            ) : (
              <View style={styles.rowActions}>
                <Button
                  label={isCompleted ? 'Wieder öffnen' : 'Als erledigt markieren'}
                  variant="secondary"
                  onPress={() => setIsCompleted((value) => !value)}
                />
              </View>
            )}
          </View>
        ) : null}
      </SectionCard>

      {!isNew && isRecurring ? (
        <SectionCard>
          <SectionHeader
            title="Erledigte Tage"
            subtitle={`${recurringCompletionHistory.length} markiert`}
          />
          {recurringCompletionHistory.length === 0 ? (
            <Text style={styles.helperCopy}>
              Diese wiederholende Aufgabe wurde bisher noch an keinem Tag erledigt.
            </Text>
          ) : (
            <View style={styles.historyList}>
              {recurringCompletionHistory.map((entry) => (
                <View key={`${entry.taskId}:${entry.date}`} style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {formatFullDateLabel(parseDateKey(entry.date))}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {entry.date} · {formatTimeLabel(entry.completedAt)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      ) : null}

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
        swipeToClose
      >
        {({ SwipeArea }) => (
          <View style={styles.tagPickerContent}>
            <SwipeArea style={styles.tagPickerDragArea}>
              <View style={styles.tagPickerActions}>
                <Button
                  label="Neuer Tag"
                  variant={tagPickerMode === 'tag' ? 'secondary' : 'ghost'}
                  onPress={() => setTagPickerMode((mode) => (mode === 'tag' ? 'list' : 'tag'))}
                />
                <Button
                  label="Neue Gruppe"
                  variant={tagPickerMode === 'group' ? 'secondary' : 'ghost'}
                  onPress={() =>
                    setTagPickerMode((mode) => (mode === 'group' ? 'list' : 'group'))
                  }
                />
              </View>

              {tagPickerMode === 'tag' ? (
                <View style={styles.createPanel}>
                  <TextField
                    label="Name"
                    value={newTagName}
                    onChangeText={setNewTagName}
                    placeholder="Tag benennen"
                  />

                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>Gruppe</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.groupPickerRow}
                    >
                      {tagGroupOptions.map((option) => {
                        const isSelected = option.key === selectedNewTagGroupKey;

                        return (
                          <Pressable
                            key={option.key}
                            style={[
                              styles.groupOption,
                              isSelected ? styles.groupOptionSelected : null,
                            ]}
                            onPress={() => setNewTagGroupName(option.value)}
                          >
                            <Text
                              numberOfLines={1}
                              style={[
                                styles.groupOptionLabel,
                                isSelected ? styles.groupOptionLabelSelected : null,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>Farbe</Text>
                    <ColorSwatchPicker value={newTagColor} onChange={setNewTagColor} />
                  </View>

                  <View style={styles.tagPickerFormActions}>
                    <Button
                      label="Tag erstellen"
                      onPress={() => void handleCreateTagFromPicker()}
                      disabled={!canCreateTag}
                    />
                    <Button
                      label="Abbrechen"
                      variant="ghost"
                      onPress={() => setTagPickerMode('list')}
                    />
                  </View>
                </View>
              ) : null}

              {tagPickerMode === 'group' ? (
                <View style={styles.createPanel}>
                  <TextField
                    label="Name"
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    placeholder="Gruppe benennen"
                  />
                  {newGroupName.trim() && !normalizedNewGroupName ? (
                    <Text style={styles.warningCopy}>Allgemein ist die Standardgruppe.</Text>
                  ) : null}
                  {newGroupAlreadyExists ? (
                    <Text style={styles.warningCopy}>Diese Gruppe existiert bereits.</Text>
                  ) : null}

                  <View style={styles.tagPickerFormActions}>
                    <Button
                      label="Gruppe erstellen"
                      onPress={() => void handleCreateGroupFromPicker()}
                      disabled={!canCreateGroup}
                    />
                    <Button
                      label="Abbrechen"
                      variant="ghost"
                      onPress={() => setTagPickerMode('list')}
                    />
                  </View>
                </View>
              ) : null}
            </SwipeArea>

            <ScrollView
              style={[styles.modalList, tagPickerMode !== 'list' ? styles.modalListCompact : null]}
              contentContainerStyle={styles.modalListContent}
              keyboardShouldPersistTaps="handled"
              persistentScrollbar
            >
              {tagPickerGroups.map((group) => (
                <View key={group.key} style={styles.tagGroup}>
                  <Text style={styles.tagGroupTitle}>{group.label}</Text>
                  <View style={styles.tagGroupRows}>
                    {group.tags.length === 0 ? (
                      <Text style={styles.emptyGroupCopy}>Noch keine Tags</Text>
                    ) : (
                      group.tags.map((tag) => {
                        const isSelected = tag.id === selectedTagId;

                        return (
                          <Pressable
                            key={tag.id}
                            style={[styles.modalRow, isSelected ? styles.modalRowSelected : null]}
                            onPress={() => {
                              setSelectedTagId(tag.id);
                              setShowTagPicker(false);
                            }}
                          >
                            <TagPill label={tag.name} color={tag.color} />
                            {isSelected ? (
                              <Text style={styles.modalSelected}>Ausgewählt</Text>
                            ) : null}
                          </Pressable>
                        );
                      })
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
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
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  optionChip: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  optionChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
  },
  optionChipLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  optionChipLabelActive: {
    color: colors.accent,
  },
  recurrenceBlock: {
    gap: spacing.sm,
  },
  weekdayRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weekdayChip: {
    minWidth: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayChipActive: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
  },
  weekdayChipLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  weekdayChipLabelActive: {
    color: colors.accent,
  },
  helperCopy: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyRow: {
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyDate: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  historyMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  tagPickerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  tagPickerContent: {
    marginTop: -spacing.lg,
  },
  tagPickerDragArea: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  createPanel: {
    gap: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  groupPickerRow: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  groupOption: {
    maxWidth: 160,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
  },
  groupOptionSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
  },
  groupOptionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  groupOptionLabelSelected: {
    color: colors.accent,
  },
  tagPickerFormActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  warningCopy: {
    color: colors.warning,
    fontSize: 13,
  },
  modalList: {
    maxHeight: 360,
  },
  modalListCompact: {
    maxHeight: 220,
  },
  modalListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  tagGroup: {
    gap: spacing.sm,
  },
  tagGroupTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tagGroupRows: {
    gap: spacing.sm,
  },
  emptyGroupCopy: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.sm,
  },
  modalRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalRowSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 107, 74, 0.14)',
  },
  modalSelected: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
});
