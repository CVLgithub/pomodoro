import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { Button } from '../ui/Button';
import { ModalSheet } from '../ui/ModalSheet';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeader } from '../ui/SectionHeader';
import { TagPill } from '../ui/TagPill';

interface TaskAssignmentCardProps {
  title: string;
  subtitle?: string;
  tasks: Task[];
  tags: Tag[];
  selectedTaskId: string | null;
  selectedTagId: string;
  onSelectTask: (taskId: string | null) => Promise<void> | void;
  onSelectFreeTag: (tagId: string) => Promise<void> | void;
}

type TaskGroup = {
  tagId: string;
  tag: Tag | null;
  tasks: Task[];
};

export const TaskAssignmentCard = ({
  title,
  subtitle,
  tasks,
  tags,
  selectedTaskId,
  selectedTagId,
  onSelectTask,
  onSelectFreeTag,
}: TaskAssignmentCardProps) => {
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [tagModalVisible, setTagModalVisible] = useState(false);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const activeTagId = selectedTask?.tagId ?? selectedTagId;
  const selectedTag = useMemo(
    () => tags.find((tag) => tag.id === activeTagId) ?? null,
    [activeTagId, tags],
  );
  const availableTasks = useMemo(
    () =>
      [...tasks].sort((left, right) => {
        const completionSort = Number(left.isCompleted) - Number(right.isCompleted);
        if (completionSort !== 0) {
          return completionSort;
        }

        if (left.date && right.date && left.date !== right.date) {
          return left.date.localeCompare(right.date);
        }

        if (left.date && !right.date) {
          return -1;
        }

        if (!left.date && right.date) {
          return 1;
        }

        return left.title.localeCompare(right.title, 'de-DE');
      }),
    [tasks],
  );
  const groupedTasks = useMemo(() => {
    const tagById = new Map(tags.map((tag) => [tag.id, tag]));
    const groups = availableTasks.reduce((result, task) => {
      const entries = result.get(task.tagId) ?? [];
      entries.push(task);
      result.set(task.tagId, entries);
      return result;
    }, new Map<string, Task[]>());

    return Array.from(groups.entries())
      .map(([tagId, tagTasks]) => ({
        tagId,
        tag: tagById.get(tagId) ?? null,
        tasks: tagTasks,
      }))
      .sort((left, right) => {
        if (left.tag && right.tag) {
          return left.tag.name.localeCompare(right.tag.name, 'de-DE');
        }

        if (left.tag) {
          return -1;
        }

        if (right.tag) {
          return 1;
        }

        return 0;
      });
  }, [availableTasks, tags]);

  return (
    <SectionCard>
      <SectionHeader
        title={title}
        subtitle={subtitle ?? (selectedTask ? 'Aufgabe verknüpft' : 'Freie Session')}
      />
      <View style={styles.assignment}>
        <View style={styles.selectionBlock}>
          <Text style={styles.selectionLabel}>Aktuell</Text>
          <Text style={styles.selectionValue}>
            {selectedTask ? selectedTask.title : 'Freie Session'}
          </Text>
          {selectedTag ? <TagPill label={selectedTag.name} color={selectedTag.color} /> : null}
        </View>
        <View style={styles.actions}>
          <Button
            label="Aufgabe wählen"
            variant="secondary"
            onPress={() => setTaskModalVisible(true)}
          />
          <Button label="Freie Session" variant="ghost" onPress={() => onSelectTask(null)} />
          <Button label="Tag wählen" variant="ghost" onPress={() => setTagModalVisible(true)} />
        </View>
      </View>

      <ModalSheet
        visible={taskModalVisible}
        title="Aufgabe zuweisen"
        onClose={() => setTaskModalVisible(false)}
      >
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          {groupedTasks.map((group: TaskGroup) => (
            <View key={group.tagId} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                {group.tag ? (
                  <TagPill label={group.tag.name} color={group.tag.color} />
                ) : (
                  <Text style={styles.groupFallbackLabel}>Ohne Tag</Text>
                )}
              </View>
              {group.tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={async () => {
                    await onSelectTask(task.id);
                    setTaskModalVisible(false);
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalTitle}>{task.title}</Text>
                  <Text style={styles.modalMeta}>
                    {task.date ? `${task.date} · ` : ''}
                    {task.isCompleted ? 'Erledigt' : 'Offen'}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          {availableTasks.length === 0 ? (
            <Text style={styles.emptyCopy}>Keine Aufgaben verfügbar.</Text>
          ) : null}
        </ScrollView>
      </ModalSheet>

      <ModalSheet
        visible={tagModalVisible}
        title="Tag für freie Session"
        onClose={() => setTagModalVisible(false)}
      >
        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
          {tags.map((tag) => (
            <Pressable
              key={tag.id}
              onPress={async () => {
                await onSelectFreeTag(tag.id);
                setTagModalVisible(false);
              }}
              style={styles.modalRow}
            >
              <TagPill label={tag.name} color={tag.color} />
            </Pressable>
          ))}
        </ScrollView>
      </ModalSheet>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  assignment: {
    gap: spacing.lg,
  },
  selectionBlock: {
    gap: spacing.sm,
  },
  selectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selectionValue: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  actions: {
    gap: spacing.sm,
  },
  modalList: {
    maxHeight: 320,
  },
  groupSection: {
    marginBottom: spacing.lg,
  },
  groupHeader: {
    marginBottom: spacing.sm,
  },
  groupFallbackLabel: {
    alignSelf: 'flex-start',
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  modalRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.xs,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  emptyCopy: {
    color: colors.textSecondary,
    paddingVertical: spacing.lg,
  },
});
