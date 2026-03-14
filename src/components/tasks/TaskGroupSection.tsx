import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';
import { SectionCard } from '../ui/SectionCard';
import { SectionHeader } from '../ui/SectionHeader';
import { TaskRow } from './TaskRow';

interface TaskGroupSectionProps {
  title: string;
  tasks: Task[];
  tagsById: Record<string, Tag>;
  onToggleTask: (task: Task, nextValue: boolean) => void;
  onPressTask: (task: Task) => void;
}

export const TaskGroupSection = ({
  title,
  tasks,
  tagsById,
  onToggleTask,
  onPressTask,
}: TaskGroupSectionProps) => (
  <SectionCard>
    <SectionHeader title={title} subtitle={`${tasks.length} Einträge`} />
    <View>
      {tasks.length === 0 ? (
        <Text style={styles.emptyText}>Noch keine Aufgaben.</Text>
      ) : (
        tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            tag={tagsById[task.tagId]}
            onPress={() => onPressTask(task)}
            onToggle={(value) => onToggleTask(task, value)}
          />
        ))
      )}
    </View>
  </SectionCard>
);

const styles = StyleSheet.create({
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
