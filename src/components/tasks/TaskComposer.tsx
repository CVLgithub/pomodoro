import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../../constants/colors';
import { themedStyles } from '../../theme/runtime';

interface TaskComposerProps {
  placeholder: string;
  onSubmit: (title: string) => void;
  /** Zeichnet eine Trennlinie über der Zeile, wenn sie unter anderen Zeilen steht. */
  separated?: boolean;
}

/** Eingabezeile zum schnellen Anlegen einer Aufgabe ohne eigenen Screen. */
export const TaskComposer = ({ placeholder, onSubmit, separated = false }: TaskComposerProps) => {
  const [draft, setDraft] = useState('');

  const submit = () => {
    const title = draft.trim();
    if (!title) {
      return;
    }

    setDraft('');
    onSubmit(title);
  };

  return (
    <View style={[styles.composer, separated ? styles.separated : null]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aufgabe hinzufügen"
        accessibilityState={{ disabled: !draft.trim() }}
        onPress={submit}
        style={styles.icon}
      >
        <Ionicons name="add" size={22} color={colors.textPrimary} />
      </Pressable>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        onSubmitEditing={submit}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={placeholder}
        returnKeyType="done"
        submitBehavior="submit"
        style={styles.input}
      />
    </View>
  );
};

const styles = themedStyles(() => ({
  composer: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  separated: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  icon: {
    width: 54,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingRight: 16,
    color: colors.textPrimary,
    fontSize: 17,
  },
}));
