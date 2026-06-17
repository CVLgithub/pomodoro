import { Tag } from '../types/tag';

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

export const getTagGroupKey = (groupName?: string | null): string =>
  normalizeCustomTagGroupName(groupName) ?? DEFAULT_TAG_GROUP_KEY;

export const getTagGroupLabel = (groupName?: string | null): string =>
  normalizeCustomTagGroupName(groupName) ?? DEFAULT_TAG_GROUP_LABEL;

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

export const buildTagGroupOptions = (
  tags: Tag[],
  savedGroupNames: string[] = [],
): TagGroupOption[] => {
  const customGroupNames = normalizeTagGroupNames([
    ...savedGroupNames,
    ...tags.map((tag) => tag.groupName),
  ]);

  return [
    {
      key: DEFAULT_TAG_GROUP_KEY,
      label: DEFAULT_TAG_GROUP_LABEL,
      value: null,
    },
    ...customGroupNames.map((groupName) => ({
      key: getTagGroupKey(groupName),
      label: groupName,
      value: groupName,
    })),
  ];
};

export const sortTagsByGroupAndName = (tags: Tag[]): Tag[] =>
  [...tags].sort((left, right) => {
    const groupCompare = compareTagGroupNames(left.groupName, right.groupName);
    if (groupCompare !== 0) {
      return groupCompare;
    }

    return left.name.localeCompare(right.name, 'de-DE', { sensitivity: 'base' });
  });
