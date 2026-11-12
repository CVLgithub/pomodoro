import { useEffect, useState } from 'react';
import { Text } from 'react-native';

import { colors } from '../../constants/colors';
import { useSettingsStore } from '../../store/settingsStore';
import { themedStyles } from '../../theme/runtime';
import { TagGroup } from '../../types/tagGroup';
import { Button } from '../ui/Button';
import { ModalSheet } from '../ui/ModalSheet';
import { TextField } from '../ui/TextField';

interface NewGroupSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Wird nach dem Anlegen mit der neuen Gruppe aufgerufen. */
  onCreated?: (group: TagGroup) => void;
}

/** Legt eine Tag-Gruppe an. Die einzige Stelle dafür in der App. */
export const NewGroupSheet = ({ visible, onClose, onCreated }: NewGroupSheetProps) => {
  const createTagGroup = useSettingsStore((state) => state.createTagGroup);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName('');
      setError(null);
    }
  }, [visible]);

  const save = async () => {
    setIsSaving(true);
    try {
      const group = await createTagGroup(name);
      onCreated?.(group);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Gruppe konnte nicht erstellt werden');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalSheet visible={visible} title="Neue Gruppe" onClose={onClose} swipeToClose>
      <TextField
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="z. B. Arbeit"
        autoFocus
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Gruppe erstellen" onPress={() => void save()} disabled={!name.trim() || isSaving} />
    </ModalSheet>
  );
};

const styles = themedStyles(() => ({
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
}));
