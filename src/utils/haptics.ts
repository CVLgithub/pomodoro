import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Haptik ist reine Rückmeldung: Fehlt sie (Web, altes Gerät, im System
// abgeschaltet, Build ohne das native Modul), darf das nie eine Aktion stören.
// Fehler werden daher verworfen.
const run = (effect: () => Promise<void>) => {
  if (Platform.OS === 'web') {
    return;
  }

  effect().catch(() => undefined);
};

export const haptics = {
  /** Feiner Tick, wenn eine Auswahl auf einen anderen Wert rastet. */
  selection: () => run(() => Haptics.selectionAsync()),
  /** Leichter Impuls, wenn etwas aufgeht oder umschaltet. */
  light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Bestätigung für etwas Erledigtes. */
  success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
};
