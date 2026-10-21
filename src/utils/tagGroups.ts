import { Tag } from '../types/tag';
import { TagGroup } from '../types/tagGroup';
import { GENERAL_TAG_GROUP_ID } from '../constants/config';

export const DEFAULT_TAG_GROUP_KEY = '__default__';
export const DEFAULT_TAG_GROUP_LABEL = 'Allgemein';
export const UNGROUPED_TAG_GROUP_KEY = DEFAULT_TAG_GROUP_KEY;
export const UNGROUPED_TAG_GROUP_LABEL = DEFAULT_TAG_GROUP_LABEL;

export type TagGroupOption = {
  key: string;
  label: string;
  value: string | null;
};

export const normalizeTagGroupName = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

export const isDefaultTagGroupName = (value?: string | null): boolean => {
  const normalizedValue = normalizeTagGroupName(value);

  return Boolean(
    normalizedValue &&
      normalizedValue.localeCompare(DEFAULT_TAG_GROUP_LABEL, 'de-DE', {
        sensitivity: 'base',
      }) === 0,
  );
};

export const normalizeCustomTagGroupName = (value?: string | null): string | null => {
  const normalizedValue = normalizeTagGroupName(value);

  if (!normalizedValue || isDefaultTagGroupName(normalizedValue)) {
    return null;
  }

  return normalizedValue;
};

export const getTagGroupKey = (groupId?: string | null): string =>
  groupId ?? GENERAL_TAG_GROUP_ID;

export const getTagGroupLabel = (groupId?: string | null, groups: TagGroup[] = []): string =>
  groups.find((group) => group.id === groupId)?.name ?? DEFAULT_TAG_GROUP_LABEL;

export const compareTagGroupNames = (
  left: string | null | undefined,
  right: string | null | undefined,
): number => {
  const normalizedLeft = normalizeCustomTagGroupName(left);
  const normalizedRight = normalizeCustomTagGroupName(right);

  if (normalizedLeft && normalizedRight) {
    return normalizedLeft.localeCompare(normalizedRight, 'de-DE', {
      sensitivity: 'base',
    });
  }

  if (normalizedLeft) {
    return 1;
  }

  if (normalizedRight) {
    return -1;
  }

  return 0;
};

export const normalizeTagGroupNames = (groupNames: (string | null | undefined)[]): string[] => {
  const groupsByCompareKey = new Map<string, string>();

  groupNames.forEach((groupName) => {
    const normalizedGroupName = normalizeCustomTagGroupName(groupName);

    if (!normalizedGroupName) {
      return;
    }

    groupsByCompareKey.set(normalizedGroupName.toLocaleLowerCase('de-DE'), normalizedGroupName);
  });

  return Array.from(groupsByCompareKey.values()).sort(compareTagGroupNames);
};

export const buildTagGroupOptions = (tags: Tag[], groups: TagGroup[] = []): TagGroupOption[] => {
  return [
    {
      key: GENERAL_TAG_GROUP_ID,
      label: DEFAULT_TAG_GROUP_LABEL,
      value: GENERAL_TAG_GROUP_ID,
    },
    ...groups
      .filter((group) => group.id !== GENERAL_TAG_GROUP_ID && !group.isDeleted)
      .map((group) => ({
      key: group.id,
      label: group.name,
      value: group.id,
    })),
  ];
};

export const sortTagsByGroupAndName = (tags: Tag[]): Tag[] =>
  [...tags].sort((left, right) => {
    return left.name.localeCompare(right.name, 'de-DE', { sensitivity: 'base' });
  });
