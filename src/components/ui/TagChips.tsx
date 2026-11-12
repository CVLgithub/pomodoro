import { useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { colors } from '../../constants/colors';
import { GENERAL_TAG_GROUP_ID } from '../../constants/config';
import { useSettingsStore } from '../../store/settingsStore';
import { themedStyles } from '../../theme/runtime';
import { Tag } from '../../types/tag';
import { buildTagGroupOptions, getTagGroupKey } from '../../utils/tagGroups';
import { ChoiceChips } from './ChoiceChips';

interface TagChipsProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string) => void;
}

/**
 * Tag-Auswahl, nach Tag-Gruppen gegliedert: je Gruppe eine seitlich scrollbare
 * Zeile, genau ein Tag kann gewählt sein. Ein von außen gesetzter Tag (beim
 * Öffnen, nach dem Laden oder neu angelegt) rückt in seiner Zeile nach vorn,
 * damit er ohne Scrollen sichtbar ist. Tippt man selbst einen Chip an, bleibt
 * die Reihenfolge stehen.
 */
export const TagChips = ({ tags, selectedTagId, onSelect }: TagChipsProps) => {
  const tagGroups = useSettingsStore((state) => state.tagGroups);
  const [leadingTagId, setLeadingTagId] = useState(selectedTagId);
  const knownSelection = useRef(selectedTagId);

  if (knownSelection.current !== selectedTagId) {
    knownSelection.current = selectedTagId;
    setLeadingTagId(selectedTagId);
  }

  const sections = useMemo(() => {
    const groups = buildTagGroupOptions(tags, tagGroups);
    const knownKeys = new Set(groups.map((group) => group.key));
    // Tags einer nicht mehr vorhandenen Gruppe landen unter „Allgemein“.
    const keyOf = (tag: Tag) => {
      const key = getTagGroupKey(tag.groupId);
      return knownKeys.has(key) ? key : GENERAL_TAG_GROUP_ID;
    };

    return groups
      .map((group) => {
        const groupTags = tags.filter((tag) => keyOf(tag) === group.key);

        return {
          key: group.key,
          label: group.label,
          tags: [
            ...groupTags.filter((tag) => tag.id === leadingTagId),
            ...groupTags.filter((tag) => tag.id !== leadingTagId),
          ],
        };
      })
      .filter((section) => section.tags.length > 0);
  }, [leadingTagId, tagGroups, tags]);

  const select = (tagId: string) => {
    knownSelection.current = tagId;
    onSelect(tagId);
  };

  return (
    <View style={styles.sections}>
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          {sections.length > 1 ? <Text style={styles.groupLabel}>{section.label}</Text> : null}
          <ChoiceChips
            singleRow
            options={section.tags.map((tag) => ({ value: tag.id, label: tag.name, color: tag.color }))}
            selected={selectedTagId ? [selectedTagId] : []}
            onToggle={select}
          />
        </View>
      ))}
    </View>
  );
};

const styles = themedStyles(() => ({
  sections: {
    gap: 10,
  },
  section: {
    gap: 6,
  },
  groupLabel: {
    paddingHorizontal: 4,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
}));
