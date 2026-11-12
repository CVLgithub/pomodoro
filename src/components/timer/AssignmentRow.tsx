import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { FREE_SESSION_TITLE } from '../../constants/config';
import { AssignmentTarget, routes } from '../../constants/routes';
import { useOpenSheet } from '../../hooks/useSheet';
import { themedStyles } from '../../theme/runtime';
import { Tag } from '../../types/tag';
import { Task } from '../../types/task';

interface AssignmentRowProps {
  tasks: Task[];
  tags: Tag[];
  selectedTaskId: string | null;
  selectedTagId: string;
  /** Ob die Auswahl für den Timer oder die Stoppuhr gilt. */
  target: AssignmentTarget;
}

/**
 * Zeigt, woran gerade gearbeitet wird, und öffnet das Sheet mit der Auswahl
 * für Aufgabe oder freie Session mit Tag.
 */
export const AssignmentRow = ({
  tasks,
  tags,
  selectedTaskId,
  selectedTagId,
  target,
}: AssignmentRowProps) => {
  const openSheet = useOpenSheet();
  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  );
  const activeTagId = selectedTask?.tagId ?? selectedTagId;
  const activeTag = useMemo(
    () => tags.find((tag) => tag.id === activeTagId) ?? null,
    [activeTagId, tags],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Zuordnung: ${selectedTask?.title ?? FREE_SESSION_TITLE}${
        activeTag ? `, ${activeTag.name}` : ''
      }. Ändern`}
      onPress={() => openSheet(routes.assignmentSheet(target))}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={[styles.dot, { backgroundColor: activeTag?.color ?? colors.textMuted }]} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>
          {selectedTask?.title ?? FREE_SESSION_TITLE}
        </Text>
        {activeTag ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {activeTag.name}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </Pressable>
  );
};

const styles = themedStyles(() => ({
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: colors.surfaceElevated,
  },
  pressed: {
    opacity: 0.8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
  },
}));
