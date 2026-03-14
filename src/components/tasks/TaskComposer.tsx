import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../constants/spacing';
import { Button } from '../ui/Button';
import { TextField } from '../ui/TextField';

interface TaskComposerProps {
  placeholder?: string;
  onSubmit: (title: string) => Promise<void> | void;
}

export const TaskComposer = ({
  placeholder = 'Neue Aufgabe',
  onSubmit,
}: TaskComposerProps) => {
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrap}>
        <TextField
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>
      <View style={styles.buttonWrap}>
        <Button
          label="Hinzufügen"
          onPress={handleSubmit}
          disabled={!value.trim() || isSubmitting}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
  },
  inputWrap: {
    flex: 1,
  },
  buttonWrap: {
    minWidth: 128,
  },
});

