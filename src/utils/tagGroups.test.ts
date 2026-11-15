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

  it('filters out completed tag groups and detects completed tags via their group', async () => {
    const { buildTagGroupOptions, isTagCompleted } = await import('./tagGroups');
    const groups = [
      {
        id: 'group-active',
        name: 'Aktuell',
        isCompleted: false,
        completedAt: null,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        isDeleted: false,
        deletedAt: null,
      },
      {
        id: 'group-done',
        name: 'WS 25/26',
        isCompleted: true,
        completedAt: '2026-03-01',
        createdAt: '2026-01-01',
        updatedAt: '2026-03-01',
        isDeleted: false,
        deletedAt: null,
      },
    ];

    expect(buildTagGroupOptions([], groups).map((g) => g.key)).toEqual([
      GENERAL_TAG_GROUP_ID,
      'group-active',
    ]);
    expect(buildTagGroupOptions([], groups, { includeCompleted: true }).map((g) => g.key)).toEqual([
      GENERAL_TAG_GROUP_ID,
      'group-active',
      'group-done',
    ]);
    expect(isTagCompleted({ isCompleted: false, groupId: 'group-done' }, groups)).toBe(true);
    expect(isTagCompleted({ isCompleted: false, groupId: 'group-active' }, groups)).toBe(false);
    expect(isTagCompleted({ isCompleted: true, groupId: 'group-active' }, groups)).toBe(true);
  });
});
