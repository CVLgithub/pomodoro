import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { Button } from '../ui/Button';
import { ModalSheet } from '../ui/ModalSheet';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeader } from '../ui/SectionHeader';
import { TagPill } from '../ui/TagPill';

interface TaskAssignmentCardProps {
  title: string;
  tasks: Task[];
  tags: Tag[];
  selectedTaskId: string | null;
  selectedTagId: string;
  onSelectTask: (taskId: string | null) => Promise<void> | void;
  onSelectFreeTag: (tagId: string) => Promise<void> | void;
}

export const TaskAssignmentCard = ({
  title,
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
    () => [...tasks].sort((left, right) => Number(left.isCompleted) - Number(right.isCompleted)),
    [tasks],
  );

  return (
    <SectionCard>
      <SectionHeader
        title={title}
        subtitle={selectedTask ? 'Aufgabe verknüpft' : 'Freie Session'}
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
          {availableTasks.map((task) => (
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
