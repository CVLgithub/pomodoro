import { Tag } from '../../types/tag';
import { ChoiceChips } from './ChoiceChips';

interface TagChipsProps {
  tags: Tag[];
  selectedTagId: string | null;
  onSelect: (tagId: string) => void;
}

/** Tag-Auswahl als Reihe von Chips; genau einer kann gewählt sein. */
export const TagChips = ({ tags, selectedTagId, onSelect }: TagChipsProps) => (
  <ChoiceChips
    options={tags.map((tag) => ({ value: tag.id, label: tag.name, color: tag.color }))}
    selected={selectedTagId ? [selectedTagId] : []}
    onToggle={onSelect}
  />
);
