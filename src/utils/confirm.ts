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
