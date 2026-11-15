import { describe, expect, it } from 'vitest';

import { GENERAL_TAG_GROUP_ID } from '../constants/config';
import { hasDuplicateTagNameInGroup, isSameTagName } from './tagGroups';

describe('tagGroups uniqueness helpers', () => {
  const existingTags = [
    {
      id: 'tag-1',
      name: 'Projekt',
      groupId: GENERAL_TAG_GROUP_ID,
      isDeleted: false,
    },
    {
      id: 'tag-2',
      name: 'Mathe',
      groupId: 'group-uni',
      isDeleted: false,
    },
    {
      id: 'tag-deleted',
      name: 'Archiv',
      groupId: 'group-uni',
      isDeleted: true,
    },
  ];

  it('allows the same tag name in a different tag group', () => {
    expect(hasDuplicateTagNameInGroup(existingTags, 'Projekt', 'group-uni')).toBe(false);
    expect(hasDuplicateTagNameInGroup(existingTags, 'Mathe', GENERAL_TAG_GROUP_ID)).toBe(false);
    expect(hasDuplicateTagNameInGroup(existingTags, 'Mathe', 'group-work')).toBe(false);
  });

  it('rejects duplicate tag names within the same group case-insensitively', () => {
    expect(hasDuplicateTagNameInGroup(existingTags, 'Projekt', GENERAL_TAG_GROUP_ID)).toBe(true);
    expect(hasDuplicateTagNameInGroup(existingTags, '  projekt ', null)).toBe(true);
    expect(hasDuplicateTagNameInGroup(existingTags, 'MATHE', 'group-uni')).toBe(true);
  });

  it('ignores the tag being updated and soft-deleted tags', () => {
    expect(hasDuplicateTagNameInGroup(existingTags, 'Mathe', 'group-uni', 'tag-2')).toBe(false);
    expect(hasDuplicateTagNameInGroup(existingTags, 'Archiv', 'group-uni')).toBe(false);
  });

  it('compares tag names case-insensitively', () => {
    expect(isSameTagName('Übung', 'übung')).toBe(true);
    expect(isSameTagName('Projekt', 'Projekte')).toBe(false);
  });
});
