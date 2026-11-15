import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { Glass } from '../../src/components/ui/Glass';
import { ListGroup, ListRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { colors } from '../../src/constants/colors';
import { GENERAL_TAG_GROUP_ID } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { useOpenSheet } from '../../src/hooks/useSheet';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { themedStyles } from '../../src/theme/runtime';
import { confirmAction } from '../../src/utils/confirm';
import {
  buildTagGroupOptions,
  getTagGroupKey,
  getTagGroupLabel,
  sortTagsByGroupAndName,
} from '../../src/utils/tagGroups';

export default function TagsScreen() {
  const router = useRouter();
  const [showCompleted, setShowCompleted] = useState(false);
  const tags = useTagsStore((state) => state.tags);
  const loadTags = useTagsStore((state) => state.loadTags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const setTagGroupCompleted = useSettingsStore((state) => state.setTagGroupCompleted);
  const deleteTagGroup = useSettingsStore((state) => state.deleteTagGroup);
  const openSheet = useOpenSheet();

  const { groups, completedGroups, completedTags, completedCount } = useMemo(() => {
    const completedGroupIds = new Set(
      tagGroups
        .filter((group) => !group.isDeleted && group.isCompleted)
        .map((group) => group.id),
    );
    const activeTags = sortTagsByGroupAndName(
      tags.filter((tag) => !tag.isCompleted && !completedGroupIds.has(getTagGroupKey(tag.groupId))),
    );
    const allSortedTags = sortTagsByGroupAndName(tags);

    const activeGroupList = buildTagGroupOptions(activeTags, tagGroups).map((group) => ({
      id: group.key,
      label: group.label,
      tags: activeTags.filter((tag) => getTagGroupKey(tag.groupId) === group.key),
      totalCount: tags.filter((tag) => getTagGroupKey(tag.groupId) === group.key).length,
    }));

    const completedGroupList = tagGroups
      .filter((group) => group.id !== GENERAL_TAG_GROUP_ID && !group.isDeleted && group.isCompleted)
      .map((group) => ({
        id: group.id,
        label: group.name,
        tags: allSortedTags.filter((tag) => getTagGroupKey(tag.groupId) === group.id),
        totalCount: tags.filter((tag) => getTagGroupKey(tag.groupId) === group.id).length,
      }));

    const individualCompletedTags = allSortedTags.filter(
      (tag) => tag.isCompleted && !completedGroupIds.has(getTagGroupKey(tag.groupId)),
    );

    const totalCompletedCount =
      individualCompletedTags.length +
      completedGroupList.reduce((sum, group) => sum + Math.max(1, group.tags.length), 0);

    return {
      groups: activeGroupList,
      completedGroups: completedGroupList,
      completedTags: individualCompletedTags,
      completedCount: totalCompletedCount,
    };
  }, [tagGroups, tags]);

  const toggleGroupCompleted = async (groupId: string, isCompleted: boolean) => {
    try {
      await setTagGroupCompleted(groupId, isCompleted);
    } catch (error) {
      Alert.alert(
        isCompleted
          ? 'Gruppe konnte nicht abgeschlossen werden'
          : 'Gruppe konnte nicht wieder geöffnet werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  const removeGroup = async (group: (typeof groups)[number]) => {
    const confirmed = await confirmAction({
      title: `Gruppe „${group.label}“ löschen?`,
      message:
        group.totalCount === 0
          ? 'Die Gruppe enthält keine Tags.'
          : group.totalCount === 1
            ? 'Der enthaltene Tag wird nach „Allgemein“ verschoben.'
            : `Die ${group.totalCount} enthaltenen Tags werden nach „Allgemein“ verschoben.`,
      confirmLabel: 'Löschen',
    });

    if (!confirmed) {
      return;
    }

    try {
      await deleteTagGroup(group.id);
      await loadTags();
    } catch (error) {
      Alert.alert(
        'Gruppe konnte nicht gelöscht werden',
        error instanceof Error ? error.message : 'Unbekannter Fehler',
      );
    }
  };

  return (
    <Screen
      title="Tags und Gruppen"
      onBack={() => router.back()}
      headerRight={
        <CircleButton
          icon="add"
          label="Neuer Tag"
          variant="primary"
          onPress={() => router.push(routes.newTag)}
        />
      }
    >
      {groups.map((group) => (
        <ListGroup key={group.id} title={group.label}>
          {group.tags.length === 0 ? (
            <ListRow label="Noch keine Tags" disabled />
          ) : (
            group.tags.map((tag, index) => (
              <ListRow
                key={tag.id}
                label={tag.name}
                dotColor={tag.color}
                separated={index > 0}
                onPress={() => router.push(routes.tag(tag.id))}
              />
            ))
          )}
          {group.id === GENERAL_TAG_GROUP_ID ? null : (
            <>
              <ListRow
                label="Gruppe abschließen"
                icon="checkmark-circle-outline"
                tone="action"
                separated
                onPress={() => void toggleGroupCompleted(group.id, true)}
              />
              <ListRow
                label="Gruppe löschen"
                icon="trash-outline"
                tone="danger"
                separated
                onPress={() => void removeGroup(group)}
              />
            </>
          )}
        </ListGroup>
      ))}

      <Button
        label="Neue Gruppe"
        variant="secondary"
        onPress={() => openSheet(routes.newGroupSheet)}
      />

      {completedCount > 0 ? (
        <View style={styles.completedSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showCompleted }}
            onPress={() => setShowCompleted((value) => !value)}
          >
            <Glass radius={25} style={styles.completedToggle}>
              <Text style={styles.completedLabel}>Abgeschlossen</Text>
              <Text style={styles.completedCount}>{completedCount}</Text>
              <Ionicons
                name={showCompleted ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </Glass>
          </Pressable>
          {showCompleted ? (
            <View style={styles.completedContent}>
              {completedGroups.map((group) => (
                <ListGroup key={group.id} title={group.label}>
                  {group.tags.length === 0 ? (
                    <ListRow label="Keine Tags" disabled />
                  ) : (
                    group.tags.map((tag, index) => (
                      <ListRow
                        key={tag.id}
                        label={tag.name}
                        dotColor={tag.color}
                        separated={index > 0}
                        onPress={() => router.push(routes.tag(tag.id))}
                      />
                    ))
                  )}
                  <ListRow
                    label="Gruppe wieder öffnen"
                    icon="refresh-outline"
                    tone="action"
                    separated
                    onPress={() => void toggleGroupCompleted(group.id, false)}
                  />
                  <ListRow
                    label="Gruppe löschen"
                    icon="trash-outline"
                    tone="danger"
                    separated
                    onPress={() => void removeGroup(group)}
                  />
                </ListGroup>
              ))}

              {completedTags.length > 0 ? (
                <ListGroup title={completedGroups.length > 0 ? 'Einzelne Tags' : undefined}>
                  {completedTags.map((tag, index) => {
                    const groupKey = getTagGroupKey(tag.groupId);
                    const groupLabel =
                      groupKey !== GENERAL_TAG_GROUP_ID
                        ? getTagGroupLabel(groupKey, tagGroups)
                        : undefined;

                    return (
                      <ListRow
                        key={tag.id}
                        label={tag.name}
                        value={groupLabel}
                        dotColor={tag.color}
                        separated={index > 0}
                        onPress={() => router.push(routes.tag(tag.id))}
                      />
                    );
                  })}
                </ListGroup>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = themedStyles(() => ({
  completedSection: {
    gap: 8,
    paddingTop: 4,
  },
  completedContent: {
    gap: 14,
  },
  completedToggle: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
  },
  completedLabel: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
  },
  completedCount: {
    color: colors.textSecondary,
    fontSize: 17,
  },
}));
