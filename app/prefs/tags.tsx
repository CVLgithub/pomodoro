import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '../../src/components/ui/Button';
import { CircleButton } from '../../src/components/ui/CircleButton';
import { ListGroup, ListRow } from '../../src/components/ui/List';
import { Screen } from '../../src/components/ui/Screen';
import { GENERAL_TAG_GROUP_ID } from '../../src/constants/config';
import { routes } from '../../src/constants/routes';
import { useOpenSheet } from '../../src/hooks/useSheet';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useTagsStore } from '../../src/store/tagsStore';
import { confirmAction } from '../../src/utils/confirm';
import { buildTagGroupOptions, getTagGroupKey, sortTagsByGroupAndName } from '../../src/utils/tagGroups';

export default function TagsScreen() {
  const router = useRouter();
  const tags = useTagsStore((state) => state.tags);
  const loadTags = useTagsStore((state) => state.loadTags);
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const deleteTagGroup = useSettingsStore((state) => state.deleteTagGroup);
  const openSheet = useOpenSheet();

  const groups = useMemo(() => {
    const sortedTags = sortTagsByGroupAndName(tags);

    return buildTagGroupOptions(tags, tagGroups).map((group) => ({
      id: group.key,
      label: group.label,
      tags: sortedTags.filter((tag) => getTagGroupKey(tag.groupId) === group.key),
    }));
  }, [tagGroups, tags]);

  const removeGroup = async (group: (typeof groups)[number]) => {
    const confirmed = await confirmAction({
      title: `Gruppe „${group.label}“ löschen?`,
      message:
        group.tags.length === 0
          ? 'Die Gruppe enthält keine Tags.'
          : group.tags.length === 1
            ? 'Der enthaltene Tag wird nach „Allgemein“ verschoben.'
            : `Die ${group.tags.length} enthaltenen Tags werden nach „Allgemein“ verschoben.`,
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
            <ListRow
              label="Gruppe löschen"
              icon="trash-outline"
              tone="danger"
              separated
              onPress={() => void removeGroup(group)}
            />
          )}
        </ListGroup>
      ))}

      <Button
        label="Neue Gruppe"
        variant="secondary"
        onPress={() => openSheet(routes.newGroupSheet)}
      />
    </Screen>
  );
}
