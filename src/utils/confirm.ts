import { Alert, Platform } from 'react-native';

interface ConfirmActionOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** Kennzeichnet die Bestätigung als löschend (Standard). */
  destructive?: boolean;
}

/** Rückfrage vor einer Aktion; funktioniert auch im Web, wo `Alert.alert` nichts anzeigt. */
export const confirmAction = ({
  title,
  message,
  confirmLabel,
  destructive = true,
}: ConfirmActionOptions): Promise<boolean> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return Promise.resolve(window.confirm(message ? `${title}\n\n${message}` : title));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Abbrechen', style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
};

interface ChoiceOption<T extends string> {
  value: T;
  label: string;
  style?: 'default' | 'destructive';
}

interface ChooseActionOptions<T extends string> {
  title: string;
  message: string;
  /** Wahlmöglichkeiten neben "Abbrechen"; die erste gilt im Web als Bestätigung. */
  options: readonly ChoiceOption<T>[];
  cancelLabel?: string;
}

/**
 * Rückfrage mit mehreren Antworten. Liefert den gewählten Wert oder `null` bei
 * Abbruch. Im Web gibt es nur Bestätigen oder Abbrechen; Bestätigen wählt die
 * erste Option.
 */
export const chooseAction = <T extends string>({
  title,
  message,
  options,
  cancelLabel = 'Abbrechen',
}: ChooseActionOptions<T>): Promise<T | null> => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const first = options[0];
    const confirmed = window.confirm(`${title}\n\n${message}\n\nOK: ${first.label}`);
    return Promise.resolve(confirmed ? first.value : null);
  }

  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        ...options.map((option) => ({
          text: option.label,
          style: option.style ?? ('default' as const),
          onPress: () => resolve(option.value),
        })),
        { text: cancelLabel, style: 'cancel' as const, onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
};
