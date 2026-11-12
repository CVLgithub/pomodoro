import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Text, TextInput } from 'react-native';

import { Button } from '../../src/components/ui/Button';
import { Sheet } from '../../src/components/ui/Sheet';
import { TextField } from '../../src/components/ui/TextField';
import { colors } from '../../src/constants/colors';
import { useSheetAutoFocus, useSheetClose } from '../../src/hooks/useSheet';
import { useSettingsStore } from '../../src/store/settingsStore';
import { themedStyles } from '../../src/theme/runtime';
import { haptics } from '../../src/utils/haptics';

/**
 * Legt eine Tag-Gruppe an. Die einzige Stelle dafür in der App. Der Screen
 * darunter erkennt die neue Gruppe am geänderten Bestand im Store.
 */
export default function NewGroupSheet() {
  const close = useSheetClose();
  const createTagGroup = useSettingsStore((state) => state.createTagGroup);
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useSheetAutoFocus(nameInput);

  const save = async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      await createTagGroup(name);
      haptics.success();
      close();
    } catch (saveError) {
      setIsSaving(false);
      setError(saveError instanceof Error ? saveError.message : 'Gruppe konnte nicht erstellt werden');
    }
  };

  return (
    <Sheet title="Neue Gruppe">
      <TextField
        ref={nameInput}
        label="Name"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setError(null);
        }}
        placeholder="z. B. Arbeit"
        returnKeyType="done"
        onSubmitEditing={() => void save()}
      />
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <Button label="Gruppe erstellen" onPress={() => void save()} disabled={!name.trim() || isSaving} />
    </Sheet>
  );
}

const styles = themedStyles(() => ({
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
}));
