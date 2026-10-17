import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { radii, spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { getTaskScheduleLabel } from '../../utils/taskRecurrence';
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

const sortTasks = (left: Task, right: Task) => {
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
};

const groupTasksByTag = (tasks: Task[], tags: Tag[]) => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const groups = tasks.reduce((result, task) => {
    const entries = result.get(task.tagId) ?? [];
    entries.push(task);
    result.set(task.tagId, entries);
    return result;
  }, new Map<string, Task[]>());

  return Array.from(groups.entries())
    .map(([tagId, tagTasks]) => ({
      tagId,
      tag: tagById.get(tagId) ?? null,
      tasks: [...tagTasks].sort(sortTasks),
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
  const openTaskGroups = useMemo(
    () => groupTasksByTag(tasks.filter((task) => !task.isCompleted), tags),
    [tasks, tags],
  );
  const completedTaskGroups = useMemo(
    () => groupTasksByTag(tasks.filter((task) => task.isCompleted), tags),
    [tasks, tags],
  );

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
          {openTaskGroups.length > 0 ? (
            <View style={[styles.statusSection, styles.openSection]}>
              <View style={styles.statusSectionHeader}>
                <Text style={styles.statusHeading}>Offene Aufgaben</Text>
              </View>
              {openTaskGroups.map((group: TaskGroup) => (
                <View key={`${group.tagId}-open`} style={styles.groupSection}>
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
                        {getTaskScheduleLabel(task) ?? 'Ohne Datum'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {completedTaskGroups.length > 0 ? (
            <View style={[styles.statusSection, styles.completedSection]}>
              <View style={styles.statusSectionHeader}>
                <Text style={[styles.statusHeading, styles.completedHeading]}>Erledigte Aufgaben</Text>
                <Text style={styles.completedDescription}>
                  Abgeschlossene Aufgaben sind separat aufgeführt.
                </Text>
              </View>
              {completedTaskGroups.map((group: TaskGroup) => (
                <View key={`${group.tagId}-completed`} style={styles.groupSection}>
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
                      style={[styles.modalRow, styles.modalRowCompleted]}
                    >
                      <Text style={[styles.modalTitle, styles.modalTitleCompleted]}>{task.title}</Text>
                      <Text style={styles.modalMeta}>
                        {getTaskScheduleLabel(task) ?? 'Ohne Datum'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          ) : null}

          {tasks.length === 0 ? <Text style={styles.emptyCopy}>Keine Aufgaben verfügbar.</Text> : null}
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
  statusSection: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  openSection: {
    gap: spacing.lg,
  },
  completedSection: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(160, 167, 180, 0.35)',
    backgroundColor: 'rgba(24, 27, 33, 0.92)',
  },
  statusSectionHeader: {
    gap: spacing.xs,
  },
  statusEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  completedHeading: {
    color: colors.success,
  },
  statusHeading: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  completedDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  groupSection: {
    gap: spacing.sm,
  },
  groupHeader: {
    marginBottom: spacing.xs,
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
  modalRowCompleted: {
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(95, 211, 141, 0.16)',
    backgroundColor: colors.surface,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitleCompleted: {
    color: colors.textSecondary,
    textDecorationLine: 'line-through',
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
